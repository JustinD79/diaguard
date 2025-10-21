import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export class ScanCreditManager {
  private static STORAGE_PREFIX = 'scan_credits_';
  private static TRANSACTION_LOG_PREFIX = 'scan_transaction_';

  static async reserveScanCredit(userId: string): Promise<ScanReservation | null> {
    try {
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scanKey = this.getScanKey(userId);
      const transactionKey = `${this.TRANSACTION_LOG_PREFIX}${transactionId}`;

      const currentScans = await this.getCurrentScans(userId);
      const scanLimit = await this.getScanLimit(userId);

      if (currentScans >= scanLimit && scanLimit !== 999999) {
        return null;
      }

      const reservation: ScanReservation = {
        transactionId,
        userId,
        timestamp: Date.now(),
        status: 'reserved',
        previousCount: currentScans,
        newCount: currentScans + 1,
      };

      await AsyncStorage.setItem(scanKey, (currentScans + 1).toString());
      await AsyncStorage.setItem(transactionKey, JSON.stringify(reservation));

      await this.logScanTransaction(userId, transactionId, 'reserved');

      return reservation;
    } catch (error) {
      console.error('Error reserving scan credit:', error);
      return null;
    }
  }

  static async confirmScanSuccess(transactionId: string): Promise<boolean> {
    try {
      const transactionKey = `${this.TRANSACTION_LOG_PREFIX}${transactionId}`;
      const reservationData = await AsyncStorage.getItem(transactionKey);

      if (!reservationData) {
        console.error('No reservation found for transaction:', transactionId);
        return false;
      }

      const reservation: ScanReservation = JSON.parse(reservationData);
      reservation.status = 'confirmed';
      reservation.confirmedAt = Date.now();

      await AsyncStorage.setItem(transactionKey, JSON.stringify(reservation));
      await this.logScanTransaction(reservation.userId, transactionId, 'confirmed');

      return true;
    } catch (error) {
      console.error('Error confirming scan:', error);
      return false;
    }
  }

  static async rollbackScanCredit(transactionId: string): Promise<boolean> {
    try {
      const transactionKey = `${this.TRANSACTION_LOG_PREFIX}${transactionId}`;
      const reservationData = await AsyncStorage.getItem(transactionKey);

      if (!reservationData) {
        console.error('No reservation found for rollback:', transactionId);
        return false;
      }

      const reservation: ScanReservation = JSON.parse(reservationData);

      if (reservation.status === 'rolled_back') {
        console.log('Transaction already rolled back');
        return true;
      }

      const scanKey = this.getScanKey(reservation.userId);
      await AsyncStorage.setItem(scanKey, reservation.previousCount.toString());

      reservation.status = 'rolled_back';
      reservation.rolledBackAt = Date.now();
      await AsyncStorage.setItem(transactionKey, JSON.stringify(reservation));

      await this.logScanTransaction(reservation.userId, transactionId, 'rolled_back');

      console.log(`✅ Scan credit restored for user ${reservation.userId}`);

      return true;
    } catch (error) {
      console.error('Error rolling back scan credit:', error);
      return false;
    }
  }

  static async restoreScans(userId: string, amount: number): Promise<boolean> {
    try {
      const scanKey = this.getScanKey(userId);
      const currentScans = await this.getCurrentScans(userId);
      const newCount = Math.max(0, currentScans - amount);

      await AsyncStorage.setItem(scanKey, newCount.toString());

      await this.logAdminAction(userId, 'restore_scans', {
        previousCount: currentScans,
        restoredAmount: amount,
        newCount,
      });

      console.log(`✅ Restored ${amount} scans for user ${userId}`);

      return true;
    } catch (error) {
      console.error('Error restoring scans:', error);
      return false;
    }
  }

  static async getCurrentScans(userId: string): Promise<number> {
    try {
      const scanKey = this.getScanKey(userId);
      const scans = await AsyncStorage.getItem(scanKey);
      return scans ? parseInt(scans) : 0;
    } catch (error) {
      console.error('Error getting current scans:', error);
      return 0;
    }
  }

  static async getScansRemaining(userId: string): Promise<number> {
    try {
      const current = await this.getCurrentScans(userId);
      const limit = await this.getScanLimit(userId);

      if (limit === 999999) return 999999;

      return Math.max(0, limit - current);
    } catch (error) {
      console.error('Error getting scans remaining:', error);
      return 0;
    }
  }

  private static async getScanLimit(userId: string): Promise<number> {
    try {
      const { data: promoData } = await supabase
        .from('user_promo_codes')
        .select('promo_code_id, promo_codes(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (promoData) {
        return 999999;
      }

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, stripe_subscription_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription) {
        return 999999;
      }

      return 30;
    } catch (error) {
      console.error('Error getting scan limit:', error);
      return 30;
    }
  }

  private static getScanKey(userId: string): string {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return `${this.STORAGE_PREFIX}${userId}_${year}_${month}`;
  }

  private static async logScanTransaction(
    userId: string,
    transactionId: string,
    action: string
  ): Promise<void> {
    try {
      await supabase.from('scan_audit_log').insert({
        user_id: userId,
        transaction_id: transactionId,
        action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging scan transaction:', error);
    }
  }

  private static async logAdminAction(
    userId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    try {
      await supabase.from('admin_actions').insert({
        user_id: userId,
        action,
        metadata,
        performed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  static async getTransactionHistory(userId: string): Promise<ScanReservation[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const transactionKeys = keys.filter((key) =>
        key.startsWith(this.TRANSACTION_LOG_PREFIX)
      );

      const transactions: ScanReservation[] = [];

      for (const key of transactionKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const transaction: ScanReservation = JSON.parse(data);
          if (transaction.userId === userId) {
            transactions.push(transaction);
          }
        }
      }

      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  static async cleanupOldTransactions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const transactionKeys = keys.filter((key) =>
        key.startsWith(this.TRANSACTION_LOG_PREFIX)
      );

      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

      for (const key of transactionKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const transaction: ScanReservation = JSON.parse(data);
          if (transaction.timestamp < sevenDaysAgo) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      console.log('✅ Cleanup completed: old transactions removed');
    } catch (error) {
      console.error('Error cleaning up transactions:', error);
    }
  }
}

export interface ScanReservation {
  transactionId: string;
  userId: string;
  timestamp: number;
  status: 'reserved' | 'confirmed' | 'rolled_back';
  previousCount: number;
  newCount: number;
  confirmedAt?: number;
  rolledBackAt?: number;
  errorMessage?: string;
}
