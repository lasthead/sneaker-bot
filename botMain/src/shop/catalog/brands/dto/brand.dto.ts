import {Collection} from "../../collections/collections.model";

export class BrandDto {
  readonly name: string
  readonly alias?: string
  readonly collection?: Collection[]
  readonly is_active?: boolean
}
