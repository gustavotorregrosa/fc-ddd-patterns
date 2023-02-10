import Order from "../../../../domain/checkout/entity/order";
import OrderRepositoryInterface from "../../../../domain/checkout/repository/order-repository.interface";
import CustomerModel from "../../../customer/repository/sequelize/customer.model";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import OrderItem from "../../../../domain/checkout/entity/order_item";

export default class OrderRepository implements OrderRepositoryInterface {
  
  async update(entity: Order): Promise<void> {

    const sequelize = OrderModel.sequelize;
    await sequelize.transaction(async (t) => {
      await OrderItemModel.destroy({
        where: {
          order_id: entity.id,
        },
        transaction: t
      })

      const items = entity.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        product_id: item.productId,
        quantity: item.quantity,
        order_id: entity.id,

      
      }));

      await OrderItemModel.bulkCreate(items, { transaction: t })

      await OrderModel.update(
        { total: entity.total() },
        { where: { id: entity.id }, transaction: t }
      )

    })

  }

  async find(id: string): Promise<Order> {
    let orderModel;
    try {
      orderModel = await OrderModel.findOne({
        where: {
          id,
        },
        include: OrderItemModel,
        rejectOnEmpty: true,
      });
    } catch (error) {
      throw new Error("Order not found");
    }

    const items: OrderItem[] = orderModel.items.map(item => new OrderItem(item.id, item.name, item.price, item.product_id, item.quantity))

    let customerModel
    try {
      customerModel = await CustomerModel.findOne({
        where: {
          id: orderModel.customer_id
        },
        rejectOnEmpty: true,
      });
    } catch (error) {
      throw new Error("Customer not found");
    }

    return new Order(id, customerModel.id, items)

  }

  async findAll(): Promise<Order[]> {
    const ordersModel = await OrderModel.findAll();
    
    const promises = ordersModel.map(orderModel => new Promise((success, reject) => {
      this.find(orderModel.id).then(res => success(res))
    }));
    let orders = (await Promise.all(promises) as Order[])
    console.log({orders})
    return orders
    // throw new Error("Method not implemented.");
  }

  async create(entity: Order): Promise<void> {
    await OrderModel.create(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
        items: entity.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    );
  }
}
