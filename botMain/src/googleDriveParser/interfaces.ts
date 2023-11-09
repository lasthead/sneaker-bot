export interface ImportParams {
  fileId: string,
  downloadScriptPath?: string,
  outputFilePath?: string,
}

export interface ProductInterface {
  picture: string,
  sizes: ProductSize[],
  brand: string,
  collection?: string,
  article: string,
  material?: string,
  price: number,
  discount?: number,
  link?: string,
  name?: string,
}

export interface ProductSize {
  size: number,
  count: number,
}

export interface ComparedList {
  [key: string]: ComparedBrand
}

export interface ComparedBrand {
  name: string,
  collection?: string,
}

export enum Brands {
  Nike,
  'New Balance',
  Adidas,
  Reebok,
}
