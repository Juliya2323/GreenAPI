import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { saveCredentials } from '../store/storage'
import { App } from './App'

/** Answers `getStateInstance` and keeps long-poll requests open until aborted. */
function stubGreenApi() {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    if (String(input).includes('/getStateInstance/')) {
      return Promise.resolve(new Response(JSON.stringify({ stateInstance: 'authorized' })))
    }
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('logs in, starts receiving notifications and logs out', async () => {
    const fetchMock = stubGreenApi()
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('idInstance'), '3100123456')
    await user.type(screen.getByLabelText('apiTokenInstance'), 'token')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('heading', { name: 'Чаты' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining('/receiveNotification/') }),
      expect.anything(),
    )

    await user.click(screen.getByRole('button', { name: 'Выйти' }))
    expect(screen.getByRole('heading', { name: 'Вход в MAX' })).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
  })

  it('restores the session after a reload', () => {
    stubGreenApi()
    saveCredentials({
      idInstance: '3100123456',
      apiTokenInstance: 'token',
      apiUrl: 'https://3100.api.green-api.com',
    })

    render(<App />)
    expect(screen.getByRole('heading', { name: 'Чаты' })).toBeInTheDocument()
  })
})
