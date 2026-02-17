import {Platform} from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
  type Product,
  getAvailablePurchases,
  ErrorCode,
} from 'react-native-iap';
import apiClient from './apiClient';

// IAP Product IDs (must match App Store Connect / Google Play Console)
const IAP_PRODUCT_IDS = [
  'credits_10',
  'credits_25',
  'credits_60',
  'credits_100',
  'credits_250',
  'credits_600',
  'credits_1000',
  'credits_2500',
  'credits_6000',
];

type PurchaseCallback = (purchase: Purchase) => void;
type ErrorCallback = (error: PurchaseError) => void;

let purchaseUpdateSubscription: ReturnType<typeof purchaseUpdatedListener> | null = null;
let purchaseErrorSubscription: ReturnType<typeof purchaseErrorListener> | null = null;
let isConnected = false;

/**
 * Initialize IAP connection
 */
export async function initIAP(): Promise<boolean> {
  try {
    await initConnection();
    isConnected = true;
    console.log('[PaymentService] IAP connection initialized');
    return true;
  } catch (error) {
    console.log('[PaymentService] IAP init failed:', error);
    isConnected = false;
    return false;
  }
}

/**
 * End IAP connection
 */
export async function endIAPConnection(): Promise<void> {
  try {
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
      purchaseErrorSubscription = null;
    }
    if (isConnected) {
      await endConnection();
      isConnected = false;
    }
  } catch (error) {
    console.log('[PaymentService] endIAPConnection error:', error);
  }
}

/**
 * Setup global purchase listeners
 */
export function setupPurchaseListeners(
  onPurchase: PurchaseCallback,
  onError: ErrorCallback,
): void {
  // Remove existing listeners
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }

  purchaseUpdateSubscription = purchaseUpdatedListener(onPurchase);
  purchaseErrorSubscription = purchaseErrorListener(onError);
}

/**
 * Fetch IAP products from the store
 */
export async function getIAPProducts(): Promise<Product[]> {
  try {
    if (!isConnected) {
      await initIAP();
    }
    const products = await fetchProducts({skus: IAP_PRODUCT_IDS});
    const result = (products ?? []) as Product[];
    console.log('[PaymentService] Fetched', result.length, 'IAP products');
    return result;
  } catch (error) {
    console.log('[PaymentService] getIAPProducts error:', error);
    return [];
  }
}

/**
 * Purchase with IAP (Apple/Google native)
 * Result will come via purchaseUpdatedListener
 */
export async function purchaseWithIAP(productId: string): Promise<void> {
  try {
    if (!isConnected) {
      await initIAP();
    }
    // v14 API: platform-specific request params
    await requestPurchase({
      request: {
        apple: {sku: productId},
        google: {skus: [productId]},
      },
      type: 'in-app',
    });
  } catch (error: any) {
    if (error?.code === ErrorCode.UserCancelled) {
      throw new Error('USER_CANCELLED');
    }
    console.log('[PaymentService] purchaseWithIAP error:', error);
    throw error;
  }
}

/**
 * Verify IAP receipt with backend and finish transaction
 */
export async function verifyAndFinishIAP(purchase: Purchase): Promise<{
  success: boolean;
  creditsAwarded: number;
  paymentId: string;
}> {
  const platform = Platform.OS === 'ios' ? 'apple' : 'google';

  // v14: purchaseToken is the unified field (JWS on iOS, purchaseToken on Android)
  const receiptData = purchase.purchaseToken || '';
  const transactionId = purchase.transactionId || purchase.purchaseToken || '';

  try {
    const response = await apiClient.post('/payments/verify-iap', {
      platform,
      receipt_data: receiptData,
      product_id: purchase.productId,
      transaction_id: transactionId,
    });

    if (response.data.success) {
      // Only finish transaction AFTER server verification succeeds
      await finishTransaction({purchase, isConsumable: true});
      console.log('[PaymentService] IAP verified and finished:', transactionId);

      return {
        success: true,
        creditsAwarded: response.data.data.credits_awarded,
        paymentId: response.data.data.payment_id,
      };
    }

    throw new Error('Server verification returned false');
  } catch (error: any) {
    console.log('[PaymentService] verifyAndFinishIAP error:', error);

    // If already processed, still finish the transaction
    if (error?.response?.data?.data?.already_processed) {
      await finishTransaction({purchase, isConsumable: true});
      return {
        success: true,
        creditsAwarded: 0,
        paymentId: error.response.data.data.payment_id || '',
      };
    }

    throw error;
  }
}

/**
 * Create Stripe PaymentIntent via backend
 */
export async function createStripeIntent(packageId: string): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
}> {
  try {
    const response = await apiClient.post('/payments/create-intent', {
      package_id: packageId,
    });

    if (response.data.success) {
      return {
        clientSecret: response.data.data.client_secret,
        paymentIntentId: response.data.data.payment_intent_id,
        publishableKey: response.data.data.publishable_key,
      };
    }

    throw new Error('Failed to create payment intent');
  } catch (error) {
    console.log('[PaymentService] createStripeIntent error:', error);
    throw error;
  }
}

/**
 * Restore IAP purchases (required by Apple)
 */
export async function restorePurchases(): Promise<{
  restored: number;
  errors: Array<{transactionId: string; error: string}>;
}> {
  try {
    const platform = Platform.OS === 'ios' ? 'apple' : 'google';
    const purchases = await getAvailablePurchases();

    if (purchases.length === 0) {
      return {restored: 0, errors: []};
    }

    const receipts = purchases.map(p => ({
      transactionId: p.transactionId || p.purchaseToken || '',
      productId: p.productId,
      receiptData: p.purchaseToken || '',
    }));

    const response = await apiClient.post('/payments/restore', {
      platform,
      receipts,
    });

    if (response.data.success) {
      // Finish all restored transactions
      for (const purchase of purchases) {
        try {
          await finishTransaction({purchase, isConsumable: true});
        } catch (e) {
          // Ignore finish errors for already-finished transactions
        }
      }

      return response.data.data;
    }

    return {restored: 0, errors: []};
  } catch (error) {
    console.log('[PaymentService] restorePurchases error:', error);
    throw error;
  }
}

/**
 * Get payment history from backend
 */
export async function getPaymentHistory(): Promise<any[]> {
  try {
    const response = await apiClient.get('/payments/history');
    if (response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.log('[PaymentService] getPaymentHistory error:', error);
    return [];
  }
}
