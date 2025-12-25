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

function generateShortOrderId(): string {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ESP-${date}-${random}`;
}

export interface CreatePaymentLinkResult {
  url: string;
  shortOrderId: string;
}

export function createPaymentLink(params: CreatePaymentLinkParams): CreatePaymentLinkResult {
  const { orderId, customerEmail, customerPhone, planType, userId, baseUrl } = params;

  const price = planType === 'monthly' ? '990.00' : '3990.00';
  const productName = planType === 'monthly' 
    ? 'Подписка Месяц' 
    : 'Подписка Год';
  const planLabel = planType === 'monthly' ? 'месяц' : 'год';
  
  const shortOrderId = generateShortOrderId();

  const queryParams = new URLSearchParams();
  
  queryParams.append('order_id', shortOrderId);
  queryParams.append('customer_email', customerEmail);
  if (customerPhone) {
    queryParams.append('customer_phone', customerPhone);
  }
  
  queryParams.append('products[0][name]', productName);
  queryParams.append('products[0][price]', price);
  queryParams.append('products[0][quantity]', '1');
  queryParams.append('products[0][sku]', `${orderId}|${userId}|${planType}`);
  
  queryParams.append('do', 'pay');
  queryParams.append('urlReturn', `${baseUrl}/pricing?payment=success`);
  queryParams.append('urlSuccess', `${baseUrl}/pricing?payment=success`);
  queryParams.append('urlNotification', `${baseUrl}/api/payments/webhook`);
  
  queryParams.append('customer_extra', `Эзотерический Планировщик (${planLabel})`);

  return {
    url: `${getProdamusUrl()}?${queryParams.toString()}`,
    shortOrderId
  };
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

function parseProductSku(body: any): { order_id?: string; user_id?: string; plan_type?: string } {
  const sku = body.products?.[0]?.sku;
  if (!sku || typeof sku !== 'string') return {};
  
  const parts = sku.split('|');
  if (parts.length >= 3) {
    return {
      order_id: parts[0],
      user_id: parts[1],
      plan_type: parts[2]
    };
  }
  return {};
}

function parseCustomerExtra(extra: string | object): { user_id?: string; plan_type?: string } {
  if (!extra) return {};
  
  if (typeof extra === 'object') {
    return {
      user_id: (extra as any)._param_user_id || (extra as any).user_id,
      plan_type: (extra as any)._param_plan_type || (extra as any).plan_type
    };
  }
  
  if (typeof extra === 'string' && extra.includes(':')) {
    const result: { user_id?: string; plan_type?: string } = {};
    const pairs = extra.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.split(':');
      if (key === 'user_id') result.user_id = value;
      if (key === 'plan_type') result.plan_type = value;
    }
    return result;
  }
  
  return {};
}

function extractParam(body: any, paramName: string): string | undefined {
  if (body[paramName]) return body[paramName];
  
  const skuParsed = parseProductSku(body);
  if (paramName === '_param_user_id' && skuParsed.user_id) return skuParsed.user_id;
  if (paramName === '_param_plan_type' && skuParsed.plan_type) return skuParsed.plan_type;
  
  const extraParsed = parseCustomerExtra(body.customer_extra);
  if (paramName === '_param_user_id' && extraParsed.user_id) return extraParsed.user_id;
  if (paramName === '_param_plan_type' && extraParsed.plan_type) return extraParsed.plan_type;
  
  if (typeof body.customer_extra === 'object' && body.customer_extra?.[paramName]) {
    return body.customer_extra[paramName];
  }
  
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
