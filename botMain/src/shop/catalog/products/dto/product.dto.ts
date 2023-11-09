import {Collection} from "../../collections/collections.model";

export class ProductDto {
  readonly picture: string
  readonly article: string
  readonly name: string
  readonly brand: string
  readonly brand_id?: number
  readonly collection?: Collection
  readonly collection_id?: number
  readonly price: number
  readonly sizes?: []
  readonly discount?: number
  readonly is_active?: boolean
  readonly link?: string
  readonly description?: string
}
