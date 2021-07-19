import * as React from 'react'

const context = React.createContext()

export function QueryClientProvider({ children, client }) {
  return <context.Provider value={client}>{children}</context.Provider>
}

export class QueryClient {
  constructor() {
    this.queries = []
  }

  getQuery = (options) => {
    const queryHash = JSON.stringify(options.queryKey)
    let query = this.queries.find((d) => d.queryHash === queryHash)

    if (!query) {
      query = createQuery(this, options)
      this.queries.push(query)
    }

    return query
  }
}

export function useQuery({ queryKey, queryFn, staleTime }) {
  const client = React.useContext(context)

  const [, rerender] = React.useReducer((i) => i + 1, 0)

  const observerRef = React.useRef()
  if (!observerRef.current) {
    observerRef.current = createQueryObserver(client, {
      queryKey,
      queryFn,
      staleTime,
    })
  }

  React.useEffect(() => {
    return observerRef.current.subscribe(rerender)
  }, [])

  return observerRef.current.getResult()
}

export function ReactQueryDevtools() {
  return null
}

function createQuery(client, { queryKey, queryFn }) {
  let query = {
    queryKey,
    queryHash: JSON.stringify(queryKey),
    promise: null,
    subscribers: [],
    state: {
      status: 'loading',
      isFetching: true,
      data: undefined,
      error: undefined,
    },
    setState: (updater) => {
      query.state = updater(query.state)
      query.subscribers.forEach((subscriber) => subscriber.notify())
    },
    subscribe: (subscriber) => {
      query.subscribers.push(subscriber)

      return () => {
        query.subscribers = query.subscribers.filter((d) => d !== subscriber)
      }
    },
    fetch: () => {
      if (!query.promise) {
        query.promise = (async () => {
          query.setState((old) => ({
            ...old,
            isFetching: true,
            error: undefined,
          }))
          try {
            const data = await queryFn()
            query.setState((old) => ({
              ...old,
              status: 'success',
              lastUpdated: Date.now(),
              data,
            }))
          } catch (error) {
            query.setState((old) => ({
              ...old,
              status: 'error',
              error,
            }))
          } finally {
            query.promise = null
            query.setState((old) => ({
              ...old,
              isFetching: false,
            }))
          }
        })()
      }

      return query.promise
    },
  }

  return query
}

function createQueryObserver(client, { queryKey, queryFn, staleTime = 0 }) {
  const query = client.getQuery({ queryKey, queryFn })

  const observer = {
    notify: () => {},
    getResult: () => query.state,
    subscribe: (callback) => {
      observer.notify = callback
      const unsubscribe = query.subscribe(observer)

      observer.fetch()

      return unsubscribe
    },
    fetch: () => {
      if (
        !query.state.lastUpdated ||
        Date.now() - query.state.lastUpdated > staleTime
      ) {
        query.fetch()
      }
    },
  }

  return observer
}
