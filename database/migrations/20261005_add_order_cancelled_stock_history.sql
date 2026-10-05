ALTER TABLE stock_history
    MODIFY change_type ENUM(
        'MANUAL_UPDATE',
        'ORDER',
        'RESTOCK',
        'ORDER_CANCELLED'
    ) NOT NULL;
