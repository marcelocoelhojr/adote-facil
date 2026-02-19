import { Request, Response } from 'express'
import {
  CreateUserChatMessageService,
  createUserChatMessageServiceInstance,
} from '../../services/chat/create-user-chat-message.js'

class CreateUserChatMessageController {
  constructor(
    private readonly createUserChatMessage: CreateUserChatMessageService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const { receiverId, content } = request.body
    const { user } = request

    try {
      const result = await this.createUserChatMessage.execute({
        senderId: user?.id || '',
        receiverId,
        content,
      })

      return response.status(201).json(result)
    } catch (err) {
      const error = err as Error
      console.log({ error })
      return response.status(500).json({ error: error.message })
    }
  }
}

export const createUserChatMessageControllerInstance =
  new CreateUserChatMessageController(createUserChatMessageServiceInstance)
