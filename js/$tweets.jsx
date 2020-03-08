/** @jsx h */

import { h, render, Component, Fragment } from 'preact';
import map from 'lodash/map';
// import memoize from 'lodash/memoize';
import { format } from 'date-fns';
import Sync from 'svg/sync-alt.svg';
import Link from 'svg/link.svg';

// const If = ({t,children}) => (!!t && <Fragment>{children}</Fragment>)

const Raw = ({ html }) => <div dangerouslySetInnerHTML={{ __html: html }} />;

const Post = ({ post }) => (
  <article>
    <div class="post-head">
      <div class="post-tags">
        {map(post.tags, (v, k) => <a href={'/tweets/#tag=' + k} class="post-link tag">{v}</a>)}
        {map(post.author, (v) => <a href={'/tweets/#author=' + v} class="post-link author">{v}</a>)}
      </div>
      <a href={post.url} class="post-link" title={format(new Date(post.date), 'MMMM do, yyyy')}><span class="svg-icon"><Link /></span> Permalink</a>
    </div>
    <div class="post-content">{post.content ? <Raw html={post.content} /> : <div class="loading"><Sync /></div>}</div>
  </article>
);

class App extends Component {

  constructor (props) {
    super(props);

    const index = this.props.index;
    const hash = window.location.hash.slice(1);
    this.state = {
      hash,
      loading: false,
      posts: Object.fromEntries(index.posts.map((post) => [ post.id, post ])),
      tags: index.tags,
      authors: index.authors,
      latest: index.latest,
    };

    this.loading = new Map();

    this.onChange = this.onChange.bind(this);
    this.hashedPosts = this.hashedPosts.bind(this);
    this.ensurePost = this.ensurePost.bind(this);
  }

  componentDidMount () {
    window.addEventListener('hashchange', this.onChange);
  }

  componentWillUnmount () {
    window.removeEventListener('hashchange', this.onChange);
  }

  onChange () {
    this.setState({
      hash: window.location.hash.slice(1),
      prevHash: this.state.hash,
    });
  }

  parseHash () {
    return this.state.hash && String(this.state.hash).split('=').filter(Boolean) || [];
  }

  hashedPosts (target, value) {
    const posts = Object.values(this.state.posts);
    if (!target && !value) return [ this.state.latest ];
    return posts.filter((post) => {
      // console.log({ post, target, value })
      if (target === 'tag') return !!post.tags[value];
      if (target === 'author') return post.author.includes(value);
      return false;
    });
  }

  ensurePost ({ id, json }) {
    if (this.loading.has(id)) return this.loading.get(id);
    const p = fetch(json)
      .then((res) => res.json())
      .then((post) => {
        this.setState({
          posts: { ...this.state.posts, [post.id]: post },
        });
      })
      .catch(console.error); // eslint-disable-line no-console

    this.loading.set(id, p);
    return p;
  }

  render () {
    const [ target, value ] = this.parseHash();
    const posts = this.hashedPosts(target, value);

    if (this.state.loading) {
      return <div class="loading"><Sync /></div>;
    }

    posts.forEach(this.ensurePost);

    let caption = null;
    if (target === 'tag')    caption = <h4>Threads about {this.state.tags[value] || value}</h4>;
    if (target === 'author') caption = <h4>Tweets by {value}</h4>;

    return (
      <Fragment>
        {caption}
        {map(posts, (post, i) =>
          <Post post={post} key={i} />,
        )}
      </Fragment>
    );
  }
}


async function run () {
  const index = await fetch('/tweets/index.json').then((res) => res.json());


  const target = document.querySelector('.post-index section');
  while (target.firstChild) {
    target.removeChild(target.firstChild);
  }
  render(<App index={index} />, target);
}

run().catch(console.error); // eslint-disable-line
