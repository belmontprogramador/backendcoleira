import type { Price } from '../../../../common/value-objects/price.vo'
import { DomainError } from '../../../../common/errors/domain-error'

export class InvalidProductError extends DomainError {
  constructor(message: string) {
    super(message, 400)
  }
}

export interface CreateProductProps {
  id: string
  sku: string
  name: string
  description?: string | null
  price: Price
  active?: boolean
}

export interface ReconstructProductProps {
  id: string
  sku: string
  name: string
  description: string | null
  price: Price
  active: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Entidade `Product` — catálogo de venda (pingente Elopet).
 *
 * Invariantes: `sku` e `name` não vazios; `price >= 0` (garantido pelo `Price`).
 * `sku` é imutável (identificador de negócio, ex.: "pingente"). O preço é editável
 * no admin e o `Order` (V.4) tira um snapshot (`unit_price`) no momento da compra.
 */
export class Product {
  private constructor(
    private readonly _id: string,
    private readonly _sku: string,
    private _name: string,
    private _description: string | null,
    private _price: Price,
    private _active: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateProductProps): Product {
    const sku = props.sku.trim()
    const name = props.name.trim()
    if (sku.length === 0) {
      throw new InvalidProductError('SKU do produto é obrigatório')
    }
    if (name.length === 0) {
      throw new InvalidProductError('Nome do produto é obrigatório')
    }
    const now = new Date()
    return new Product(
      props.id,
      sku,
      name,
      props.description ?? null,
      props.price,
      props.active ?? true,
      now,
      now,
    )
  }

  static reconstitute(props: ReconstructProductProps): Product {
    return new Product(
      props.id,
      props.sku,
      props.name,
      props.description,
      props.price,
      props.active,
      props.createdAt,
      props.updatedAt,
    )
  }

  /**
   * Atualiza os campos editáveis de um produto (nome, descrição, preço e ativo).
   * `sku` é imutável nesta operação.
   */
  updateDetails(props: {
    name?: string
    description?: string | null
    price?: Price
    active?: boolean
  }): void {
    if (props.name !== undefined) {
      const name = props.name.trim()
      if (name.length === 0) {
        throw new InvalidProductError('Nome do produto é obrigatório')
      }
      this._name = name
    }
    if (props.description !== undefined) {
      this._description = props.description
    }
    if (props.price !== undefined) {
      this._price = props.price
    }
    if (props.active !== undefined) {
      this._active = props.active
    }
    this._updatedAt = new Date()
  }

  get id(): string {
    return this._id
  }
  get sku(): string {
    return this._sku
  }
  get name(): string {
    return this._name
  }
  get description(): string | null {
    return this._description
  }
  get price(): Price {
    return this._price
  }
  get active(): boolean {
    return this._active
  }
  get createdAt(): Date {
    return this._createdAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }
}
