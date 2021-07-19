import * as React from 'react'

const context = React.createContext()

export function QueryClientProvider({ children, client }) {
  React.useEffect(() => {
    const onFocus = () => {
      client.queries.forEach((query) => {
        query.subscribers.forEach((subscriber) => {
          subscriber.fetch()
        })
      })
    }

    window.addEventListener('visibilitychange', onFocus, false)
    window.addEventListener('focus', onFocus, false)

    return () => {
      window.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [client])

  return <context.Provider value={client}>{children}</context.Provider>
}

export class QueryClient {
  constructor() {
    this.queries = []
    this.subscribers = []
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

  subscribe = (callback) => {
    this.subscribers.push(callback)

    return () => {
      this.subscribers = this.subscribers.filter((d) => d !== callback)
    }
  }

  notify = () => {
    this.subscribers.forEach((cb) => cb())
  }
}

export function useQuery({ queryKey, queryFn, staleTime, cacheTime }) {
  const client = React.useContext(context)

  const [, rerender] = React.useReducer((i) => i + 1, 0)

  const observerRef = React.useRef()
  if (!observerRef.current) {
    observerRef.current = createQueryObserver(client, {
      queryKey,
      queryFn,
      staleTime,
      cacheTime,
    })
  }

  React.useEffect(() => {
    return observerRef.current.subscribe(rerender)
  }, [])

  return observerRef.current.getResult()
}

export function ReactQueryDevtools() {
  const client = React.useContext(context)
  const [, rerender] = React.useReducer((i) => i + 1, 0)

  React.useEffect(() => {
    return client.subscribe(rerender)
  })

  return (
    <div className="bg-black text-white divide-solid divide-y-2 divide-gray-800">
      {[...client.queries]
        .sort((a, b) => (a.queryHash > b.queryHash ? 1 : -1))
        .map((query) => {
          return (
            <div key={query.queryHash} className="p-2">
              {JSON.stringify(query.queryKey, null, 2)} -{' '}
              <span className="font-bold">
                {query.state.isFetching ? (
                  <span className="text-blue-500">fetching</span>
                ) : !query.subscribers?.length ? (
                  <span className="text-gray-500">inactive</span>
                ) : query.state.status === 'success' ? (
                  <span className="text-green-500">success</span>
                ) : query.state.status === 'error' ? (
                  <span className="text-red-500">error</span>
                ) : null}
              </span>
            </div>
          )
        })}
    </div>
  )
}

function createQuery(client, { queryKey, queryFn, cacheTime = 5 * 60 * 1000 }) {
  let query = {
    queryKey,
    queryHash: JSON.stringify(queryKey),
    promise: null,
    subscribers: [],
    gcTimeout: null,
    state: {
      status: 'loading',
      isFetching: true,
      data: undefined,
      error: undefined,
    },
    setState: (updater) => {
      query.state = updater(query.state)
      query.subscribers.forEach((subscriber) => subscriber.notify())
      client.notify()
    },
    subscribe: (subscriber) => {
      query.subscribers.push(subscriber)

      query.unscheduleGC()

      return () => {
        query.subscribers = query.subscribers.filter((d) => d !== subscriber)

        if (!query.subscribers.length) {
          query.scheduleGC()
        }
      }
    },
    scheduleGC: () => {
      query.gcTimeout = setTimeout(() => {
        client.queries = client.queries.filter((d) => d !== query)
        client.notify()
      }, cacheTime)
    },
    unscheduleGC: () => {
      clearTimeout(query.gcTimeout)
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

function createQueryObserver(
  client,
  { queryKey, queryFn, staleTime = 0, cacheTime }
) {
  const query = client.getQuery({ queryKey, queryFn, cacheTime })

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
