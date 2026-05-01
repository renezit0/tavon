-- Restaurant QR Suite - MySQL 8 schema
-- Execute with: mysql -u <user> -p <database> < database/schema.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE tenants (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  document VARCHAR(32),
  plan_code VARCHAR(64) DEFAULT 'starter',
  status ENUM('trial', 'active', 'suspended', 'cancelled') NOT NULL DEFAULT 'trial',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenants_document (document)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE restaurants (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  legal_name VARCHAR(180),
  tax_document VARCHAR(32),
  logo_url TEXT,
  cover_url TEXT,
  service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  average_delivery_minutes INT NOT NULL DEFAULT 25,
  auto_print_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  fiscal_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_restaurants_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_restaurants_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE themes (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL DEFAULT 'Default',
  mode ENUM('dark', 'light', 'auto') NOT NULL DEFAULT 'dark',
  primary_color CHAR(7) NOT NULL DEFAULT '#F2A541',
  accent_color CHAR(7) NOT NULL DEFAULT '#2EC4B6',
  surface_color CHAR(7) NOT NULL DEFAULT '#121417',
  text_color CHAR(7) NOT NULL DEFAULT '#F8FAFC',
  radius_px INT NOT NULL DEFAULT 8,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_themes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_themes_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_themes_restaurant (tenant_id, restaurant_id, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36),
  name VARCHAR(140) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_users_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  UNIQUE KEY uq_users_tenant_email (tenant_id, email),
  INDEX idx_users_restaurant (tenant_id, restaurant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36),
  name VARCHAR(90) NOT NULL,
  code VARCHAR(60) NOT NULL,
  scope ENUM('master', 'restaurant') NOT NULL DEFAULT 'restaurant',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_tenant_code (tenant_id, code),
  CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(90) NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
  role_id CHAR(36) NOT NULL,
  permission_id CHAR(36) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  user_id CHAR(36) NOT NULL,
  role_id CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dining_tables (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(80) NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  status ENUM('available', 'open', 'closing', 'disabled') NOT NULL DEFAULT 'available',
  qr_token CHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tables_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_tables_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  UNIQUE KEY uq_tables_restaurant_code (restaurant_id, code),
  UNIQUE KEY uq_tables_qr_token (qr_token),
  INDEX idx_tables_tenant_status (tenant_id, restaurant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE table_devices (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  table_id CHAR(36) NOT NULL,
  device_code VARCHAR(120) NOT NULL,
  platform ENUM('web', 'android', 'windows', 'ios', 'browser') NOT NULL DEFAULT 'browser',
  status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_devices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_devices_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_devices_table FOREIGN KEY (table_id) REFERENCES dining_tables(id),
  UNIQUE KEY uq_devices_code (tenant_id, device_code),
  INDEX idx_devices_table (tenant_id, table_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customer_qrs (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  code VARCHAR(40) NOT NULL,
  label VARCHAR(120) NOT NULL,
  status ENUM('available', 'in_use', 'inactive') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_qrs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_customer_qrs_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  UNIQUE KEY uq_customer_qrs_code (tenant_id, restaurant_id, code),
  INDEX idx_customer_qrs_status (tenant_id, restaurant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE temporary_customers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  qr_token CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_temp_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_temp_customers_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  UNIQUE KEY uq_temp_customers_token (qr_token),
  INDEX idx_temp_customers_restaurant (tenant_id, restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customer_checks (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  table_id CHAR(36) NOT NULL,
  temporary_customer_id CHAR(36),
  customer_qr_id CHAR(36),
  code VARCHAR(60) NOT NULL,
  status ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  service_fee_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  created_by CHAR(36),
  closed_by CHAR(36),
  CONSTRAINT fk_checks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_checks_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_checks_table FOREIGN KEY (table_id) REFERENCES dining_tables(id),
  CONSTRAINT fk_checks_temp_customer FOREIGN KEY (temporary_customer_id) REFERENCES temporary_customers(id),
  CONSTRAINT fk_checks_customer_qr FOREIGN KEY (customer_qr_id) REFERENCES customer_qrs(id),
  CONSTRAINT fk_checks_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_checks_closed_by FOREIGN KEY (closed_by) REFERENCES users(id),
  INDEX idx_checks_code_status (tenant_id, restaurant_id, code, status),
  INDEX idx_checks_table_status (tenant_id, restaurant_id, table_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  image_url TEXT,
  icon VARCHAR(80),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_categories_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_categories_restaurant_order (tenant_id, restaurant_id, active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ingredients (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  removable BOOLEAN NOT NULL DEFAULT TRUE,
  allergen_tags JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ingredients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_ingredients_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  UNIQUE KEY uq_ingredients_name (tenant_id, restaurant_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE addons (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sector ENUM('kitchen', 'bar', 'dessert', 'cashier') NOT NULL DEFAULT 'kitchen',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addons_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_addons_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_addons_restaurant_active (tenant_id, restaurant_id, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  temporarily_unavailable BOOLEAN NOT NULL DEFAULT FALSE,
  preparation_minutes INT NOT NULL DEFAULT 20,
  allow_notes BOOLEAN NOT NULL DEFAULT TRUE,
  sector ENUM('kitchen', 'bar', 'dessert', 'cashier') NOT NULL DEFAULT 'kitchen',
  sku VARCHAR(80),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_products_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_products_menu (tenant_id, restaurant_id, category_id, active, temporarily_unavailable),
  INDEX idx_products_featured (tenant_id, restaurant_id, featured),
  FULLTEXT KEY ft_products_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_ingredients (
  product_id CHAR(36) NOT NULL,
  ingredient_id CHAR(36) NOT NULL,
  removable BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (product_id, ingredient_id),
  CONSTRAINT fk_product_ingredients_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_ingredients_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_addons (
  product_id CHAR(36) NOT NULL,
  addon_id CHAR(36) NOT NULL,
  PRIMARY KEY (product_id, addon_id),
  CONSTRAINT fk_product_addons_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_addons_addon FOREIGN KEY (addon_id) REFERENCES addons(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_option_groups (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  min_choices INT NOT NULL DEFAULT 0,
  max_choices INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_option_groups_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_option_groups_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_option_groups_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_option_groups_product (product_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_option_values (
  id CHAR(36) PRIMARY KEY,
  option_group_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_option_values_group FOREIGN KEY (option_group_id) REFERENCES product_option_groups(id) ON DELETE CASCADE,
  INDEX idx_option_values_group (option_group_id, active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE combos (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_combos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_combos_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_combos_restaurant_active (tenant_id, restaurant_id, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE combo_items (
  combo_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (combo_id, product_id),
  CONSTRAINT fk_combo_items_combo FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
  CONSTRAINT fk_combo_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_statuses (
  code VARCHAR(32) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  sort_order INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  table_id CHAR(36) NOT NULL,
  check_id CHAR(36) NOT NULL,
  status_code VARCHAR(32) NOT NULL DEFAULT 'new',
  source ENUM('qr', 'waiter', 'cashier', 'admin', 'offline_sync') NOT NULL DEFAULT 'qr',
  customer_name VARCHAR(120) NOT NULL DEFAULT 'Cliente',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_by CHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  cancelled_by CHAR(36),
  cancel_reason TEXT,
  CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_orders_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES dining_tables(id),
  CONSTRAINT fk_orders_check FOREIGN KEY (check_id) REFERENCES customer_checks(id),
  CONSTRAINT fk_orders_status FOREIGN KEY (status_code) REFERENCES order_statuses(code),
  CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_orders_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id),
  INDEX idx_orders_live (tenant_id, restaurant_id, status_code, created_at),
  INDEX idx_orders_table_check (tenant_id, table_id, check_id),
  INDEX idx_orders_created_at (tenant_id, restaurant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  product_name_snapshot VARCHAR(160) NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  sector ENUM('kitchen', 'bar', 'dessert', 'cashier') NOT NULL DEFAULT 'kitchen',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_order_items_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order_items_order (order_id),
  INDEX idx_order_items_product_sales (tenant_id, restaurant_id, product_id, created_at),
  INDEX idx_order_items_sector (tenant_id, restaurant_id, sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_item_addons (
  order_item_id CHAR(36) NOT NULL,
  addon_id CHAR(36) NOT NULL,
  addon_name_snapshot VARCHAR(120) NOT NULL,
  price_snapshot DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (order_item_id, addon_id),
  CONSTRAINT fk_order_item_addons_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_item_addons_addon FOREIGN KEY (addon_id) REFERENCES addons(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_item_removed_ingredients (
  order_item_id CHAR(36) NOT NULL,
  ingredient_id CHAR(36) NOT NULL,
  ingredient_name_snapshot VARCHAR(120) NOT NULL,
  PRIMARY KEY (order_item_id, ingredient_id),
  CONSTRAINT fk_order_item_removed_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_item_removed_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_item_option_values (
  order_item_id CHAR(36) NOT NULL,
  option_value_id CHAR(36) NOT NULL,
  option_name_snapshot VARCHAR(120) NOT NULL,
  value_name_snapshot VARCHAR(120) NOT NULL,
  price_delta_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (order_item_id, option_value_id),
  CONSTRAINT fk_order_item_options_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_item_options_value FOREIGN KEY (option_value_id) REFERENCES product_option_values(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_status_history (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  order_id CHAR(36) NOT NULL,
  from_status_code VARCHAR(32),
  to_status_code VARCHAR(32) NOT NULL,
  changed_by CHAR(36),
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_status_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_order_status_history_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_status_history_from FOREIGN KEY (from_status_code) REFERENCES order_statuses(code),
  CONSTRAINT fk_order_status_history_to FOREIGN KEY (to_status_code) REFERENCES order_statuses(code),
  CONSTRAINT fk_order_status_history_user FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_order_status_history_order (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cash_registers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cash_registers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_cash_registers_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_cash_registers_restaurant (tenant_id, restaurant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cash_sessions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  cash_register_id CHAR(36) NOT NULL,
  opened_by CHAR(36) NOT NULL,
  closed_by CHAR(36),
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  closing_amount DECIMAL(10,2),
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  CONSTRAINT fk_cash_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_cash_sessions_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_cash_sessions_register FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id),
  CONSTRAINT fk_cash_sessions_opened_by FOREIGN KEY (opened_by) REFERENCES users(id),
  CONSTRAINT fk_cash_sessions_closed_by FOREIGN KEY (closed_by) REFERENCES users(id),
  INDEX idx_cash_sessions_open (tenant_id, restaurant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  check_id CHAR(36) NOT NULL,
  cash_session_id CHAR(36),
  method ENUM('cash', 'credit_card', 'debit_card', 'pix', 'voucher', 'split') NOT NULL,
  status ENUM('pending', 'authorized', 'paid', 'partially_paid', 'refunded', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  gateway_name VARCHAR(80),
  gateway_reference VARCHAR(160),
  pix_qr_payload TEXT,
  paid_at TIMESTAMP NULL,
  created_by CHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_payments_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_payments_check FOREIGN KEY (check_id) REFERENCES customer_checks(id),
  CONSTRAINT fk_payments_cash_session FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id),
  CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_payments_check (check_id, status),
  INDEX idx_payments_gateway (tenant_id, gateway_name, gateway_reference),
  INDEX idx_payments_created_at (tenant_id, restaurant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_webhooks (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  payload JSON NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  CONSTRAINT fk_payment_webhooks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE KEY uq_payment_webhooks_provider_external (provider, external_id),
  INDEX idx_payment_webhooks_pending (tenant_id, processed, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE printers (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sector ENUM('kitchen', 'bar', 'dessert', 'cashier') NOT NULL,
  connection_type ENUM('browser', 'local_service', 'network', 'escpos') NOT NULL DEFAULT 'browser',
  target VARCHAR(255),
  auto_print BOOLEAN NOT NULL DEFAULT FALSE,
  paper_width_mm INT NOT NULL DEFAULT 80,
  ticket_template TEXT NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_printers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_printers_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_printers_sector (tenant_id, restaurant_id, sector, auto_print)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE banners (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  title VARCHAR(160) NOT NULL,
  subtitle VARCHAR(255),
  image_url TEXT NOT NULL,
  link_target VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMP NULL,
  ends_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_banners_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_banners_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_banners_active (tenant_id, restaurant_id, active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE restaurant_settings (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  setting_key VARCHAR(120) NOT NULL,
  setting_value JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_settings_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  UNIQUE KEY uq_settings_key (tenant_id, restaurant_id, setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_items (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  name VARCHAR(140) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'un',
  current_quantity DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  low_stock_threshold DECIMAL(12,3) NOT NULL DEFAULT 0.000,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_inventory_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  INDEX idx_inventory_low_stock (tenant_id, restaurant_id, active, current_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_movements (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  inventory_item_id CHAR(36) NOT NULL,
  order_item_id CHAR(36),
  type ENUM('in', 'out', 'adjustment', 'waste') NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  reason VARCHAR(255),
  created_by CHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_stock_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_stock_inventory FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
  CONSTRAINT fk_stock_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id),
  CONSTRAINT fk_stock_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_stock_inventory_created (inventory_item_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE offline_sync_queue (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36) NOT NULL,
  device_id CHAR(36),
  entity_type VARCHAR(80) NOT NULL,
  entity_id CHAR(36),
  operation ENUM('create', 'update', 'delete') NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending', 'processing', 'synced', 'failed') NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  synced_at TIMESTAMP NULL,
  CONSTRAINT fk_offline_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_offline_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_offline_device FOREIGN KEY (device_id) REFERENCES table_devices(id),
  INDEX idx_offline_pending (tenant_id, restaurant_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  restaurant_id CHAR(36),
  actor_user_id CHAR(36),
  actor_name VARCHAR(140),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(90) NOT NULL,
  entity_id CHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  CONSTRAINT fk_audit_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  INDEX idx_audit_entity (tenant_id, entity_type, entity_id, created_at),
  INDEX idx_audit_actor (tenant_id, actor_user_id, created_at),
  INDEX idx_audit_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
