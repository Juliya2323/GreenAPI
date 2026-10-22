import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatProvider } from '../store/ChatProvider'
import { createFakeClient } from '../test/fakeClient'
import { incomingTextWebhook, statusWebhook } from '../test/fixtures'
import { ChatLayout } from './ChatLayout'

function renderChat() {
  const fake = createFakeClient()
  const onLogout = vi.fn<() => void>()
  render(
    <ChatProvider client={fake.client} idInstance="3100123456">
      <ChatLayout idInstance="3100123456" onLogout={onLogout} />
    </ChatProvider>,
  )
  return { ...fake, onLogout, user: userEvent.setup() }
}

async function openChat(user: ReturnType<typeof userEvent.setup>, phone = '+7 999 123-45-67') {
  await user.type(screen.getByRole('textbox', { name: 'Номер телефона получателя' }), phone)
  await user.click(screen.getByRole('button', { name: 'Создать чат' }))
  return screen.findByRole('region', { name: /Чат:/ })
}

describe('chat flow', () => {
  it('creates a chat, sends a message and shows the reply', async () => {
    const { client, push, user } = renderChat()

    const chat = await openChat(user)
    expect(client.checkAccount).toHaveBeenCalledWith('79991234567')
    expect(within(chat).getByRole('heading', { name: '+7 999 123-45-67' })).toBeInTheDocument()

    await user.type(
      within(chat).getByRole('textbox', { name: 'Текст сообщения' }),
      'Привет!{Enter}',
    )
    expect(client.sendMessage).toHaveBeenCalledWith({ chatId: '10000000', message: 'Привет!' })

    const log = within(chat).getByRole('log')
    expect(await within(log).findByText('Отправлено')).toBeInTheDocument()
    expect(within(log).getByText('Привет!')).toBeInTheDocument()

    act(() => push(statusWebhook({ idMessage: 'server-1', status: 'read' })))
    expect(await within(log).findByText('Прочитано')).toBeInTheDocument()

    act(() =>
      push(
        incomingTextWebhook({
          idMessage: 'reply-1',
          timestamp: Math.floor(Date.now() / 1000),
          messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ответ' } },
        }),
      ),
    )
    expect(await within(log).findByText('Ответ')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ваня' })).toBeInTheDocument()
  })

  it('rejects invalid phone numbers without calling the API', async () => {
    const { client, user } = renderChat()

    await user.type(screen.getByRole('textbox', { name: 'Номер телефона получателя' }), '123')
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Введите номер РФ')
    expect(client.checkAccount).not.toHaveBeenCalled()
  })

  it('reports numbers without a MAX account', async () => {
    const { client, user } = renderChat()
    client.checkAccount.mockResolvedValueOnce({ exist: false, chatId: '' })

    await user.type(
      screen.getByRole('textbox', { name: 'Номер телефона получателя' }),
      '79990000000',
    )
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('нет аккаунта MAX')
  })

  it('lets the user retry a message that failed to send', async () => {
    const { client, user } = renderChat()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    client.sendMessage.mockRejectedValueOnce(new Error('Нет сети'))

    const chat = await openChat(user)
    await user.type(within(chat).getByRole('textbox', { name: 'Текст сообщения' }), 'Тест{Enter}')

    const retry = await within(chat).findByRole('button', { name: 'Не отправлено. Повторить' })
    await user.click(retry)

    expect(client.sendMessage).toHaveBeenCalledTimes(2)
    expect(await within(chat).findByText('Отправлено')).toBeInTheDocument()
  })

  it('shows replies from other chats in the list with an unread badge', async () => {
    const { push } = renderChat()

    act(() =>
      push(
        incomingTextWebhook({ idMessage: 'x', senderData: { chatId: '555', chatName: 'Анна' } }),
      ),
    )

    const list = await screen.findByRole('list', { name: 'Чаты' })
    expect(within(list).getByText('Анна')).toBeInTheDocument()
    expect(within(list).getByLabelText('Непрочитанных: 1')).toBeInTheDocument()
  })
})
