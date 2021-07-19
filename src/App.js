import * as React from 'react'
// import { QueryClient, QueryClientProvider, useQuery } from 'react-query'
// import { ReactQueryDevtools } from 'react-query/devtools'

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  ReactQueryDevtools,
} from './utils/react-query-lite.js'

const queryClient = new QueryClient()

function App() {
  const [postId, setPostId] = React.useState(-1)

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex flex-col justify-content">
        <div className="p-4">
          {postId > -1 ? (
            <Post postId={postId} setPostId={setPostId} />
          ) : (
            <Posts setPostId={setPostId} />
          )}
        </div>
        <ReactQueryDevtools />
      </div>
    </QueryClientProvider>
  )
}

// Our mock data

const posts = {
  0: {
    title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur elementum lacus purus, id feugiat enim tempus sit amet. Sed ultricies a dolor eu luctus. Nulla tincidunt, mauris ac elementum dictum, nisi nibh auctor neque, non rutrum purus justo nec augue.',
  },
  1: {
    title: 'Maecenas id nunc sit amet odio varius iaculis',
    body: 'Quisque at blandit eros. Ut maximus nisl mi, quis laoreet dui commodo vel. Praesent quis sapien purus. Mauris nisl metus, pharetra quis maximus id, cursus et dui. Nam non dignissim ex. Vestibulum vel lorem imperdiet, cursus massa id, vestibulum sapien.',
  },
  2: {
    title: 'Maecenas quis ante sagittis, volutpat metus quis, ornare odio',
    body: 'Nunc vulputate nisl bibendum nulla scelerisque, ut aliquam odio congue. Pellentesque tincidunt convallis est. Duis ut orci at nisl lobortis placerat. Donec pharetra purus et commodo egestas. Donec fringilla risus vestibulum erat fringilla molestie.',
  },
  3: {
    title: 'Nunc id purus id diam vestibulum feugiat ut ac tortor',
    body: 'Duis quis mi at ligula consequat vestibulum id eu magna. Proin in mi nec nulla efficitur sagittis. Cras aliquet leo vel vehicula elementum. Vestibulum sit amet bibendum metus. Nullam ut odio id elit laoreet vestibulum.',
  },
  4: {
    title: 'Donec eget enim et quam lacinia volutpat',
    body: 'Ut posuere, lectus viverra varius pellentesque, dolor sapien convallis diam, eget efficitur metus lorem ac sapien. Donec maximus at lorem ac ornare. Donec vulputate non nunc et convallis.',
  },
}

// Our custom query hooks

function usePosts() {
  return useQuery({
    queryKey: 'posts',
    queryFn: () =>
      sleep(1000).then(() =>
        Object.entries(posts).map(([postId, post]) => ({
          id: postId,
          title: post.title,
        }))
      ),
  })
}

function usePost(postId) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => sleep(1000).then(() => posts[postId]),
  })
}

// Our components

function Posts({ setPostId }) {
  const postsQuery = usePosts()

  return (
    <div>
      <h1 className="text-3xl">Posts</h1>
      <div className="mt-2">
        {postsQuery.status === 'loading' ? (
          <div className="text-red-500 font-bold">Loading...</div>
        ) : postsQuery.status === 'error' ? (
          <span>Error: {postsQuery.error.message}</span>
        ) : (
          <>
            <ul className="list-none divide-solid divide-y-2 divide-grey-200">
              {postsQuery.data.map((post) => (
                <li
                  key={post.id}
                  onClick={() => setPostId(post.id)}
                  className="p-1 cursor-pointer hover:bg-blue-500 hover:text-white rounded"
                >
                  {post.title}
                </li>
              ))}
            </ul>
            <div className="mt-4 italic text-green-600 font-bold">
              {postsQuery.isFetching ? 'Background Updating...' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Post({ postId, setPostId }) {
  const postQuery = usePost(postId)

  return (
    <div>
      <div>
        <div
          onClick={() => setPostId(-1)}
          className="px-2 py-1 text-lg font-bold bg-blue-500 text-white cursor-pointer"
        >
          ← Back
        </div>
      </div>
      <div className="mt-4">
        {!postId || postQuery.status === 'loading' ? (
          <div className="text-red-500 font-bold">Loading...</div>
        ) : postQuery.status === 'error' ? (
          <span>Error: {postQuery.error.message}</span>
        ) : (
          <>
            <h1 className="text-2xl">{postQuery.data.title}</h1>
            <div className="mt-4">
              <p>{postQuery.data.body}</p>
            </div>
            <div className="mt-4 italic text-green-600 font-bold">
              {postQuery.isFetching ? 'Background Updating...' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Utilities

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default App
