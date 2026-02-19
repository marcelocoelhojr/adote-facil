type AnimalWithImages = {
  images: { imageData: Buffer }[]
  [key: string]: unknown
}

export function formatAnimalImages<T extends AnimalWithImages>(animals: T[]) {
  return animals.map((animal) => ({
    ...animal,
    images: animal.images.map((image) => image.imageData.toString('base64')),
  }))
}
