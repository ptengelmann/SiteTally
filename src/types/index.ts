export interface User {
  user_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Asset {
  asset_id: string;
  asset_name: string;
  qr_code_id: string;
  description?: string;
  purchase_cost?: number;
  current_status: 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'RETIRED';
  last_checked_out_by_id?: string;
  last_checkout_time?: Date;
  current_location?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Log {
  log_id: string;
  asset_id: string;
  user_id: string;
  action_type: 'CHECK_OUT' | 'CHECK_IN';
  timestamp: Date;
  job_site_name?: string;
  notes?: string;
}

export interface CheckoutRequest {
  qr_code_id: string;
  user_id: string;
  job_site_name?: string;
  notes?: string;
}

export interface CheckinRequest {
  qr_code_id: string;
  user_id: string;
  notes?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
