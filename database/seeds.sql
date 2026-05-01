-- Demo seed for development only. Replace passwords, tokens and public URLs before production.

SET NAMES utf8mb4;

INSERT INTO tenants (id, name, document, plan_code, status)
VALUES ('tenant-demo-0000-0000-0000-000000000001', 'Tavon Demo Group', '00000000000000', 'pro', 'active');

INSERT INTO restaurants (
  id, tenant_id, name, legal_name, tax_document, logo_url, cover_url, service_fee_percent, average_delivery_minutes, auto_print_enabled
) VALUES (
  'rest-demo-0000-0000-0000-000000000001',
  'tenant-demo-0000-0000-0000-000000000001',
  'Tavon',
  'Tavon LTDA',
  '00000000000000',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  10.00,
  22,
  TRUE
);

INSERT INTO themes (
  id, tenant_id, restaurant_id, name, mode, primary_color, accent_color, surface_color, text_color, radius_px, active
) VALUES (
  'theme-demo-0000-0000-0000-000000000001',
  'tenant-demo-0000-0000-0000-000000000001',
  'rest-demo-0000-0000-0000-000000000001',
  'Tavon Dark',
  'dark',
  '#F2A541',
  '#2EC4B6',
  '#121417',
  '#F8FAFC',
  8,
  TRUE
);

INSERT INTO permissions (id, code, description) VALUES
('perm-admin-manage', 'admin.manage', 'Gerenciar restaurante, usuarios e configuracoes'),
('perm-menu-manage', 'menu.manage', 'Gerenciar produtos, categorias e adicionais'),
('perm-orders-read', 'orders.read', 'Visualizar pedidos'),
('perm-orders-update', 'orders.update', 'Alterar status de pedidos'),
('perm-cashier-close', 'cashier.close', 'Fechar comandas e registrar pagamentos'),
('perm-reports-read', 'reports.read', 'Visualizar relatorios'),
('perm-audit-read', 'audit.read', 'Visualizar auditoria');

INSERT INTO roles (id, tenant_id, name, code, scope) VALUES
('role-admin-demo', 'tenant-demo-0000-0000-0000-000000000001', 'Administrador', 'admin', 'restaurant'),
('role-waiter-demo', 'tenant-demo-0000-0000-0000-000000000001', 'Garcom', 'waiter', 'restaurant'),
('role-kitchen-demo', 'tenant-demo-0000-0000-0000-000000000001', 'Cozinha', 'kitchen', 'restaurant'),
('role-cashier-demo', 'tenant-demo-0000-0000-0000-000000000001', 'Caixa', 'cashier', 'restaurant'),
('role-manager-demo', 'tenant-demo-0000-0000-0000-000000000001', 'Gerente', 'manager', 'restaurant');

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'role-admin-demo', id FROM permissions;

INSERT INTO role_permissions (role_id, permission_id) VALUES
('role-kitchen-demo', 'perm-orders-read'),
('role-kitchen-demo', 'perm-orders-update'),
('role-cashier-demo', 'perm-orders-read'),
('role-cashier-demo', 'perm-cashier-close'),
('role-manager-demo', 'perm-orders-read'),
('role-manager-demo', 'perm-orders-update'),
('role-manager-demo', 'perm-cashier-close'),
('role-manager-demo', 'perm-reports-read');

INSERT INTO users (id, tenant_id, restaurant_id, name, email, password_hash, status)
VALUES (
  'user-admin-demo',
  'tenant-demo-0000-0000-0000-000000000001',
  'rest-demo-0000-0000-0000-000000000001',
  'Administrador',
  'admin@aurora.test',
  '$2a$10$replace_this_demo_hash_before_production',
  'active'
);

INSERT INTO user_roles (user_id, role_id) VALUES ('user-admin-demo', 'role-admin-demo');

INSERT INTO dining_tables (id, tenant_id, restaurant_id, code, name, capacity, status, qr_token, sort_order) VALUES
('table-demo-01', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'M01', 'Mesa 1', 4, 'open', SHA2('M01-demo', 256), 1),
('table-demo-02', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'M02', 'Mesa 2', 4, 'available', SHA2('M02-demo', 256), 2),
('table-demo-03', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'M03', 'Mesa 3', 6, 'available', SHA2('M03-demo', 256), 3);

INSERT INTO customer_qrs (id, tenant_id, restaurant_id, code, label, status) VALUES
('custqr-demo-01', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'PAX-8F3KQ2', 'Comanda 1', 'available'),
('custqr-demo-02', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'PAX-4N7V1A', 'Comanda 2', 'available'),
('custqr-demo-03', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'PAX-9C2L6M', 'Comanda 3', 'available'),
('custqr-demo-04', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'PAX-2H8R5T', 'Comanda 4', 'available'),
('custqr-demo-05', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'PAX-7Q1D4Z', 'Comanda 5', 'available'),
('custqr-demo-06', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'PAX-5M9B3X', 'Comanda 6', 'available');

INSERT INTO categories (id, tenant_id, restaurant_id, name, description, image_url, icon, sort_order, active) VALUES
('cat-demo-burgers', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Burgers', 'Classicos da casa', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80', 'burger', 1, TRUE),
('cat-demo-mains', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Pratos', 'Cozinha quente', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80', 'utensils', 2, TRUE),
('cat-demo-drinks', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Bebidas', 'Bar e nao alcoolicos', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=900&q=80', 'glass', 3, TRUE);

INSERT INTO ingredients (id, tenant_id, restaurant_id, name, removable) VALUES
('ing-demo-onion', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Cebola roxa', TRUE),
('ing-demo-pickles', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Picles artesanal', TRUE),
('ing-demo-sauce', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Molho da casa', TRUE);

INSERT INTO addons (id, tenant_id, restaurant_id, name, price, sector, active) VALUES
('add-demo-bacon', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Bacon crocante', 7.50, 'kitchen', TRUE),
('add-demo-cheese', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Queijo extra', 6.00, 'kitchen', TRUE),
('add-demo-premium-dose', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Dose premium', 16.00, 'bar', TRUE);

INSERT INTO products (
  id, tenant_id, restaurant_id, category_id, name, description, price, image_url, active, featured, temporarily_unavailable, preparation_minutes, allow_notes, sector, sku
) VALUES
('prod-demo-smash', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'cat-demo-burgers', 'Smash Prime', 'Blend 160g, cheddar, picles artesanal, cebola roxa e molho da casa.', 39.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80', TRUE, TRUE, FALSE, 18, TRUE, 'kitchen', 'BUR-SMASH'),
('prod-demo-ribs', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'cat-demo-mains', 'Costela Barbecue', 'Costela suina assada lentamente, barbecue defumado e batatas rusticas.', 68.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80', TRUE, TRUE, FALSE, 28, TRUE, 'kitchen', 'MAIN-RIBS'),
('prod-demo-negroni', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'cat-demo-drinks', 'Negroni da Casa', 'Gin, vermute tinto, bitter italiano e laranja bahia.', 34.00, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=80', TRUE, TRUE, FALSE, 7, FALSE, 'bar', 'BAR-NEG');

INSERT INTO product_ingredients (product_id, ingredient_id, removable) VALUES
('prod-demo-smash', 'ing-demo-onion', TRUE),
('prod-demo-smash', 'ing-demo-pickles', TRUE),
('prod-demo-smash', 'ing-demo-sauce', TRUE);

INSERT INTO product_addons (product_id, addon_id) VALUES
('prod-demo-smash', 'add-demo-bacon'),
('prod-demo-smash', 'add-demo-cheese'),
('prod-demo-negroni', 'add-demo-premium-dose');

INSERT INTO product_option_groups (id, tenant_id, restaurant_id, product_id, name, required, min_choices, max_choices, sort_order) VALUES
('opt-demo-point', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'prod-demo-smash', 'Ponto da carne', TRUE, 1, 1, 1);

INSERT INTO product_option_values (id, option_group_id, name, price_delta, sort_order, active) VALUES
('opt-demo-point-rare', 'opt-demo-point', 'Mal passado', 0.00, 1, TRUE),
('opt-demo-point-medium', 'opt-demo-point', 'Ao ponto', 0.00, 2, TRUE),
('opt-demo-point-done', 'opt-demo-point', 'Bem passado', 0.00, 3, TRUE);

INSERT INTO order_statuses (code, label, sort_order) VALUES
('new', 'Novo', 1),
('preparing', 'Em preparo', 2),
('ready', 'Pronto', 3),
('delivered', 'Entregue', 4),
('cancelled', 'Cancelado', 5);

INSERT INTO printers (id, tenant_id, restaurant_id, name, sector, connection_type, target, auto_print, paper_width_mm, ticket_template, status) VALUES
('printer-demo-kitchen', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Cozinha quente', 'kitchen', 'browser', 'default', TRUE, 80, 'COZINHA\nMESA {{table}}\nCOMANDA {{check}}\n----------------\n{{items}}\n', 'active'),
('printer-demo-bar', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Bar', 'bar', 'browser', 'default', TRUE, 80, 'BAR\nMESA {{table}}\nCOMANDA {{check}}\n----------------\n{{items}}\n', 'active'),
('printer-demo-cashier', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Caixa', 'cashier', 'browser', 'default', FALSE, 80, 'COMPROVANTE\n{{customer}}\nTOTAL {{total}}\nPAGOS {{payments}}\n', 'active');

INSERT INTO banners (id, tenant_id, restaurant_id, title, subtitle, image_url, sort_order, active) VALUES
('banner-demo-hero', 'tenant-demo-0000-0000-0000-000000000001', 'rest-demo-0000-0000-0000-000000000001', 'Especial da noite', 'Produtos em destaque com preparo monitorado.', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80', 1, TRUE);
