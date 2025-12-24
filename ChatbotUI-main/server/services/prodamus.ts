import crypto from 'crypto';

function getProdamusUrl(): string {
  const url = process.env.PRODAMUS_URL;
  if (!url) {
    throw new Error('PRODAMUS_URL is not configured');
  }
  return url;
}

function getProdamusSecretKey(): string {
  const key = process.env.PRODAMUS_SECRET_KEY;
  if (!key) {
    throw new Error('PRODAMUS_SECRET_KEY is not configured');
  }
  return key;
}

interface Product {
  name: string;
  price: string;
  quantity: string;
  sum: string;
}

interface PaymentData {
  order_id: string;
  customer_email: string;
  customer_phone?: string;
  products: Product[];
  do: 'link' | 'pay';
  urlReturn?: string;
  urlSuccess?: string;
  urlNotification?: string;
  [key: string]: any;
}

function sortObjectRecursive(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectRecursive);
  }
  return Object.keys(obj)
    .sort()
    .reduce((result: any, key: string) => {
      result[key] = sortObjectRecursive(obj[key]);
      return result;
    }, {});
}

function createSignature(data: any, secretKey: string): string {
  const sortedData = sortObjectRecursive(data);
  const jsonData = JSON.stringify(sortedData);
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(jsonData)
    .digest('hex');
  return signature;
}

export function verifyWebhookSignature(data: any, receivedSignature: string): boolean {
  const dataClone = JSON.parse(JSON.stringify(data));
  delete dataClone.signature;
  const calculatedSignature = createSignature(dataClone, getProdamusSecretKey());
  
  if (calculatedSignature === receivedSignature) {
    return true;
  }
  
  const sortedData = sortObjectRecursive(dataClone);
  const jsonData = JSON.stringify(sortedData);
  const hmacSig = crypto
    .createHmac('sha256', getProdamusSecretKey())
    .update(jsonData, 'utf8')
    .digest('hex');
  
  return hmacSig === receivedSignature;
}

interface CreatePaymentLinkParams {
  orderId: string;
  customerEmail: string;
  customerPhone?: string;
  planType: 'monthly' | 'yearly';
  userId: string;
  baseUrl: string;
}

export function createPaymentLink(params: CreatePaymentLinkParams): string {
  const { orderId, customerEmail, customerPhone, planType, userId, baseUrl } = params;

  const price = planType === 'monthly' ? '990.00' : '3990.00';
  const productName = planType === 'monthly' 
    ? 'Эзотерический Планировщик - Месячная подписка' 
    : 'Эзотерический Планировщик - Годовая подписка';

  const paymentData: PaymentData = {
    order_id: orderId,
    customer_email: customerEmail,
    products: [{
      name: productName,
      price: price,
      quantity: '1',
      sum: price
    }],
    do: 'link',
    urlReturn: `${baseUrl}/pricing`,
    urlSuccess: `${baseUrl}/pricing?payment=success`,
    urlNotification: `${baseUrl}/api/payments/webhook`,
    _param_user_id: userId,
    _param_plan_type: planType
  };

  if (customerPhone) {
    paymentData.customer_phone = customerPhone;
  }

  const signature = createSignature(paymentData, getProdamusSecretKey());
  paymentData.signature = signature;

  const queryString = new URLSearchParams();
  
  function addToQuery(prefix: string, obj: any) {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object') {
          Object.keys(item).forEach(key => {
            queryString.append(`${prefix}[${index}][${key}]`, String(item[key]));
          });
        } else {
          queryString.append(`${prefix}[${index}]`, String(item));
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        addToQuery(`${prefix}[${key}]`, obj[key]);
      });
    } else {
      queryString.append(prefix, String(obj));
    }
  }

  Object.keys(paymentData).forEach(key => {
    const value = paymentData[key];
    if (Array.isArray(value)) {
      addToQuery(key, value);
    } else {
      queryString.append(key, String(value));
    }
  });

  return `${getProdamusUrl()}?${queryString.toString()}`;
}

export interface WebhookPayload {
  order_id: string;
  order_num?: string;
  payment_status: 'success' | 'pending' | 'failed';
  payment_status_description?: string;
  sum: string;
  customer_email?: string;
  customer_phone?: string;
  _param_user_id?: string;
  _param_plan_type?: 'monthly' | 'yearly';
  signature?: string;
  date?: string;
  [key: string]: any;
}

function extractParam(body: any, paramName: string): string | undefined {
  if (body[paramName]) return body[paramName];
  if (body.customer_extra?.[paramName]) return body.customer_extra[paramName];
  if (body.products?.[0]?.[paramName]) return body.products[0][paramName];
  
  for (const key of Object.keys(body)) {
    if (typeof body[key] === 'object' && body[key] !== null) {
      if (body[key][paramName]) return body[key][paramName];
    }
  }
  return undefined;
}

export function parseWebhookData(body: any): WebhookPayload {
  return {
    order_id: body.order_id || body.order_num || '',
    order_num: body.order_num,
    payment_status: body.payment_status || 'pending',
    payment_status_description: body.payment_status_description,
    sum: body.sum || body.products?.[0]?.price || '0',
    customer_email: body.customer_email,
    customer_phone: body.customer_phone,
    _param_user_id: extractParam(body, '_param_user_id'),
    _param_plan_type: extractParam(body, '_param_plan_type') as 'monthly' | 'yearly' | undefined,
    signature: body.signature,
    date: body.date
  };
}
