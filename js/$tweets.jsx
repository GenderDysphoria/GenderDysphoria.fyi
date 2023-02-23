/* eslint-disable react/prop-types, n/no-missing-import, import/no-unresolved */
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */

/** @jsx h */

import { h, render, Component, Fragment } from 'preact';
import map from 'lodash/map';
// import memoize from 'lodash/memoize';
import { format } from 'date-fns';
import Sync from 'svg/sync-alt.svg';
import Link from 'svg/link.svg';
import AngleLeft from 'svg/angle-left.svg';
import AngleRight from 'svg/angle-right.svg';
import AngleDoubleLeft from 'svg/angle-double-left.svg';
import AngleDoubleRight from 'svg/angle-double-right.svg';

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

const Pagination = ({ post }) => (
  <div class="pager">
    <div class="prev" >{post.siblings && post.siblings.prev  && <a href={'/tweets/#id=' + post.siblings.prev.replace('/tweets/', '')} class="btn btn-primary left"><span class="svg-icon"><AngleLeft /></span> Back</a>}</div>
    <div class="first">{post.siblings && post.siblings.first && <a href={'/tweets/#id=' + post.siblings.first.replace('/tweets/', '')} class="btn btn-primary left"><span class="svg-icon"><AngleDoubleLeft /></span> Newest</a>}</div>
    <div class="last" >{post.siblings && post.siblings.last  && <a href={'/tweets/#id=' + post.siblings.last.replace('/tweets/', '')} class="btn btn-primary right">Oldest <span class="svg-icon"><AngleDoubleRight /></span></a>}</div>
    <div class="next" >{post.siblings && post.siblings.next  && <a href={'/tweets/#id=' + post.siblings.next.replace('/tweets/', '')} class="btn btn-primary right">Next <span class="svg-icon"><AngleRight /></span></a>}</div>
  </div>
);

class App extends Component {

  constructor (props) {
    super(props);

    const hash = window.location.hash.slice(1);
    const index = this.props.index;
    if (index) {
      this.state = {
        hash,
        loading: false,
        posts: Object.fromEntries(index.posts.map((post) => [ post.id, post ])),
        tags: index.tags,
        authors: index.authors,
        latest: index.latest,
      };
    } else {
      this.state = {
        hash,
        loading: true,
        posts: {},
        tags: {},
        authors: [],
        latest: null,
      };
      this.loadContent().catch(console.error); // eslint-disable-line no-console
    }

    this.loading = new Map();

    this.onChange = this.onChange.bind(this);
    this.hashedPosts = this.hashedPosts.bind(this);
    this.ensurePost = this.ensurePost.bind(this);
  }

  async loadContent () {
    const index = await fetch('/tweets/index.json').then((res) => res.json());
    this.setState({
      loading: false,
      posts: Object.fromEntries(index.posts.map((post) => [ post.id, post ])),
      tags: index.tags,
      authors: index.authors,
      latest: index.latest,
    });
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
    let posts = [ this.state.latest ];
    let paginate = true;
    if (target === 'id' && this.state.posts[value]) {
      posts = [ this.state.posts[value] ];
    } else if (target) {
      posts = this.hashedPosts(target, value);
      paginate = false;
    }

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
          <Post post={post} key={i} />
        )}
        {paginate && <Pagination post={posts[0]} />}
      </Fragment>
    );
  }
}


async function run () {
  const target = document.querySelector('.post-index section');

  let index = null;
  if (window.location.hash.length <= 1) {
    index = await fetch('/tweets/index.json').then((res) => res.json());
  }

  while (target.firstChild) target.removeChild(target.firstChild);
  render(<App index={index} />, target);
}

run().catch(console.error); // eslint-disable-line
