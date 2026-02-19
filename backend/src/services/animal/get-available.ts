import { Animal } from '@prisma/client'
import { Either, Success } from '../../utils/either.js'
import {
  AnimalRepository,
  animalRepositoryInstance,
} from '../../repositories/animal.js'

export namespace GetAvailableAnimalsDTO {
  export type Params = {
    userId: string
    gender?: string
    type?: string
    name?: string
  }

  export type Failure = { message: string }

  export type Success = { animals: Array<Animal & { images: string[] }> }

  export type Result = Either<Failure, Success>
}

export class GetAvailableAnimalsService {
  constructor(private readonly animalRepository: AnimalRepository) {}

  async execute(
    params: GetAvailableAnimalsDTO.Params,
  ): Promise<GetAvailableAnimalsDTO.Result> {
    const { userId, gender, type, name } = params

    const animals = await this.animalRepository.findAllAvailableNotFromUser({
      userId,
      gender,
      type,
      name,
    })

    const formattedAnimals = animals.map((animal) => {
      return {
        ...animal,
        images: animal.images.map((image) => {
          return image.imageData.toString('base64')
        }),
      }
    })

    return Success.create({ animals: formattedAnimals })
  }
}

export const getAvailableAnimalsServiceInstance =
  new GetAvailableAnimalsService(animalRepositoryInstance)
