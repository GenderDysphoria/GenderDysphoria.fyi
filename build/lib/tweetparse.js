var twemoji = require('twemoji' );
const { deepPick, has } = require('./util');
const path = require('path');

const schema = {
  id_str: true,
  created_at: true,
  user: {
    screen_name: true,
    avatar: true,
    name_html: true,
    verified: true,
    protected: true,
  },
  html: true,
  html_i18n: true,
  full_text: true,
  full_text_i18n: true,
  quoted_status_id_str: true,
  entities: { media: [ {
    type: true,
    media_url_https: true,
    dimensions: true,
    video_info: { variants: [ {
      url: true,
      content_type: true,
    } ] },
  } ] },
  media: true,
  in_reply_to_status_id_str: true,
};

var entityProcessors = {
  hashtags (tags, tweet) {
    tags.forEach((tagObj) => {
      tweet.html = tweet.html.replace('#' + tagObj.text, `<a href="https://twitter.com/hashtag/{tagObj.text}" class="hashtag">#${tagObj.text}</a>`);
      if (tweet.html_i18n !== undefined) {
        const langs = Object.keys(tweet.html_i18n);
        for (const lang of langs) {
          tweet.html_i18n[lang] = tweet.html_i18n[lang].replace('#' + tagObj.text, `<a href="https://twitter.com/hashtag/{tagObj.text}" class="hashtag">#${tagObj.text}</a>`);
        }
      }
    });
  },

  symbols (/* symbols, tweet */) {

  },

  user_mentions (users, tweet) {
    users.forEach((userObj) => {
      var regex = new RegExp('@' + userObj.screen_name, 'gi' );
      const mention_html = `<a href="https://twitter.com/${userObj.screen_name}" class="mention">@${userObj.screen_name}</a>`;
      tweet.html = tweet.html.replace(regex, mention_html);
      if (tweet.html_i18n !== undefined) {
        const langs = Object.keys(tweet.html_i18n);
        for (const lang of langs) {
          tweet.html_i18n[lang] = tweet.html_i18n[lang].replace(regex, mention_html);
        }
      }
    });
  },

  urls (urls, tweet) {
    urls.forEach(({ url, expanded_url, display_url }) => {
      const isQT = tweet.quoted_status_permalink && url === tweet.quoted_status_permalink.url;
      const className = isQT ? 'quoted-tweet' : 'url';
      const fancy_html = `<a href="${expanded_url}" class="${className}">${display_url}</a>`;
      tweet.html = tweet.html.replace(url, isQT ? '' : fancy_html);
      if (tweet.html_i18n !== undefined) {
        const langs = Object.keys(tweet.html_i18n);
        for (const lang of langs) {
          tweet.html_i18n[lang] = tweet.html_i18n[lang].replace(url, isQT ? '' : fancy_html);
        }
      }
    });
  },

  media (media, tweet) {
    media.forEach((m) => {
      tweet.html = tweet.html.replace(m.url, '');
      if (tweet.html_i18n !== undefined) {
        const langs = Object.keys(tweet.html_i18n);
        for (const lang of langs) {
          tweet.html_i18n[lang] = tweet.html_i18n[lang].replace(m.url, '');
        }
      }
      let width, height;

      if (has(m, 'video_info.aspect_ratio')) {
        [ width, height ] = m.video_info.aspect_ratio;
      } else if (has(m, 'sizes.medium')) {
        ({ width, height } = m.sizes.medium);
      }

      if (width && height) {
        const ratioH = Math.round((height / width) * 100);
        const ratioW = Math.round((width / height) * 100);
        let orientation = 'wide';
        if (ratioH > 100) {
          orientation = 'tall';
        } else if (ratioH === 100) {
          orientation = 'square';
        }

        m.dimensions = {
          width,
          height,
          ratioH,
          ratioW,
          orientation,
        };
      }
      return;
    });
  },
};

module.exports = exports = function (tweets) {
  return tweets.length ? tweets.map(parseTweet) : parseTweet(tweets);

  function parseStep1 (text) {
    return text.split(/(\r\n|\n\r|\r|\n)+/)
      .map((s) => s.trim() && '<p>' + s + '</p>')
      .filter(Boolean)
      .join('');
  }

  function parseTweet (tweet) {
    // clone the tweet so we're not altering the original
    tweet = JSON.parse(JSON.stringify(tweet));

    tweet.user.avatar = {
      input: tweet.user.profile_image_url_https,
      output: `tweets/${tweet.user.screen_name}.jpg`,
      cache: `twitter-avatars/${tweet.user.screen_name}.jpg`,
    };

    tweet.media = [
      tweet.user.avatar,
    ];

    // Copying text value to a new property html. The final output will be set to this property
    if (tweet.full_text !== undefined || tweet.text !== undefined) {
      tweet.html = parseStep1(tweet.full_text || tweet.text);
    }
    if (tweet.html_i18n === undefined) {
      tweet.html_i18n = {};
    }
    if (tweet.full_text_i18n === undefined) {
      tweet.full_text_i18n = {};
    }

    // Find which languages we actually have translations for
    const possible_langs = Object.keys(tweet.full_text_i18n);
    const langs = [];
    for (const lang of possible_langs) {
      const trimed = tweet.full_text_i18n[lang].trim();
      if (trimed.length > 0) {
        langs.push(lang);
      }
    }

    for (const lang of langs) {
      tweet.html_i18n[lang] = parseStep1(tweet.full_text_i18n[lang]);
    }

    if (tweet.quoted_status) {
      tweet.quoted_status = parseTweet(tweet.quoted_status);
    }

    if (has(tweet, 'entities.media') && has(tweet, 'extended_entities.media')) {
      tweet.entities.media = tweet.extended_entities.media.map((media) => {
        media = { ...media };
        if (media.media_url_https) {
          const mediaItem = {
            input: media.media_url_https,
            output: `tweets/${tweet.id_str}/${path.basename(media.media_url_https)}`,
            cache: `twitter-entities/${tweet.id_str}/${path.basename(media.media_url_https)}`,
          };
          if (media.type === 'photo') mediaItem.input += '?name=medium';
          tweet.media.push(mediaItem);
          media.media_url_https = '/' + mediaItem.output;
        }

        if (media.video_info && media.video_info.variants) {
          media.video_info.variants = media.video_info.variants.map((variant) => {
            if (!variant.url || !variant.bitrate) return variant;

            const fname = path.basename(variant.url).split('?')[0];
            const mediaItem = {
              input: variant.url,
              output: `tweets/${tweet.id_str}/${fname}`,
              cache: `twitter-entities/${tweet.id_str}/${fname}`,
            };
            tweet.media.push(mediaItem);
            variant.url = '/' + mediaItem.output;

            return variant;
          });
        }

        return media;
      });

      delete tweet.extended_entities;
    }

    // Process entities
    if (Object.getOwnPropertyNames(tweet.entities).length) {
      for (let [ entityType, entity ] of Object.entries(tweet.entities)) { // eslint-disable-line prefer-const
        entityProcessors[entityType](entity, tweet);
      }
    }

    // Process Emoji's
    if (tweet.html) {
      tweet.html = twemoji.parse(tweet.html);
    }
    for (const lang of langs) {
      tweet.html_i18n[lang] = twemoji.parse(tweet.html_i18n[lang]);
    }
    if (tweet.user !== undefined && tweet.user.name !== undefined) {
      tweet.user.name_html = twemoji.parse(tweet.user.name);
    }

    return deepPick(tweet, schema);
  }

};
