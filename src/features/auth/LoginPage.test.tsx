import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GreenApiError } from '../../api/errors'
import type { GreenApiClient } from '../../api/greenApiClient'
import type { Credentials } from '../../domain/types'
import { createFakeClient } from '../../test/fakeClient'
import { LoginPage } from './LoginPage'

function renderLogin() {
  const { client } = createFakeClient()
  const onLogin = vi.fn<(credentials: Credentials) => void>()
  const clientFactory = vi.fn<(credentials: Credentials) => GreenApiClient>(() => client)
  render(<LoginPage onLogin={onLogin} clientFactory={clientFactory} />)
  return { client, clientFactory, onLogin, user: userEvent.setup() }
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, idInstance = '3100123456') {
  await user.type(screen.getByLabelText('idInstance'), idInstance)
  await user.type(screen.getByLabelText('apiTokenInstance'), 'token')
  await user.click(screen.getByRole('button', { name: 'Войти' }))
}

describe('LoginPage', () => {
  it('verifies the instance and logs in with the derived API URL', async () => {
    const { clientFactory, onLogin, user } = renderLogin()

    await fillAndSubmit(user)

    const expected = {
      idInstance: '3100123456',
      apiTokenInstance: 'token',
      apiUrl: 'https://3100.api.green-api.com',
    }
    expect(clientFactory).toHaveBeenCalledWith(expected)
    expect(onLogin).toHaveBeenCalledWith(expected)
  })

  it('keeps the submit button disabled until both fields are filled', async () => {
    const { user } = renderLogin()
    const submit = screen.getByRole('button', { name: 'Войти' })

    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('idInstance'), '1')
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('apiTokenInstance'), 't')
    expect(submit).toBeEnabled()
  })

  it('rejects a non-numeric idInstance', async () => {
    const { clientFactory, user } = renderLogin()

    await fillAndSubmit(user, 'abc')

    expect(screen.getByRole('alert')).toHaveTextContent('только из цифр')
    expect(clientFactory).not.toHaveBeenCalled()
  })

  it('explains that the instance needs authorization', async () => {
    const { client, onLogin, user } = renderLogin()
    client.getStateInstance.mockResolvedValueOnce({ stateInstance: 'notAuthorized' })

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Инстанс не авторизован')
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('shows API errors', async () => {
    const { client, user } = renderLogin()
    client.getStateInstance.mockRejectedValueOnce(
      new GreenApiError('unauthorized', 'Неверный idInstance или apiTokenInstance'),
    )

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный idInstance')
  })

  it('toggles token visibility', async () => {
    const { user } = renderLogin()
    const token = screen.getByLabelText('apiTokenInstance')

    expect(token).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Показать токен' }))
    expect(token).toHaveAttribute('type', 'text')
  })
})
