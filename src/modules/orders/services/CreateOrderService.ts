import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const findedCustomer = await this.customersRepository.findById(customer_id);
    if (!findedCustomer) {
      throw new AppError("This Customer doesn't exist");
    }
    const productsId = products.map(product => ({ id: product.id }));

    const findedProducts = await this.productsRepository.findAllById(
      productsId,
    );
    if (findedProducts.length !== products.length) {
      throw new AppError("One or more products don't exist");
    }

    const newProducts = findedProducts.map(product => {
      const findProduct = products.find(prod => prod.id === product.id);

      if (!findProduct) {
        throw new AppError('Product not found');
      }

      if (product.quantity < findProduct.quantity) {
        throw new AppError('Product out of stock');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: findProduct.quantity,
      };
    });

    await this.productsRepository.updateQuantity(products);

    const order = this.ordersRepository.create({
      customer: findedCustomer,
      products: newProducts,
    });

    return order;
  }
}

export default CreateOrderService;
