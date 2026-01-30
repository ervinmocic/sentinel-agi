<?php
/**
 * Plugin Name: Sentinel Connector
 * Plugin URI: https://sentinel.ai
 * Description: Connects your WordPress/WooCommerce site to the Sentinel AGI Dashboard.
 * Version: 1.0.0
 * Author: Sentinel AI
 * Author URI: https://sentinel.ai
 * License: GPL2
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Sentinel_Connector {
    
    private $api_url;
    private $api_key;

    public function __construct() {
        // Initialize settings
        add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );

        // Hook into WooCommerce events (if active)
        if ( in_array( 'woocommerce/woocommerce.php', apply_filters( 'active_plugins', get_option( 'active_plugins' ) ) ) ) {
            add_action( 'woocommerce_new_order', array( $this, 'send_order_to_sentinel' ), 10, 1 );
        }

        // Hook into User registration
        add_action( 'user_register', array( $this, 'send_user_to_sentinel' ), 10, 1 );

        $this->api_url = get_option( 'sentinel_api_url' );
        $this->api_key = get_option( 'sentinel_api_key' );
    }

    public function add_admin_menu() {
        add_options_page( 'Sentinel Settings', 'Sentinel', 'manage_options', 'sentinel-connector', array( $this, 'options_page' ) );
    }

    public function register_settings() {
        register_setting( 'sentinel_options', 'sentinel_api_url' );
        register_setting( 'sentinel_options', 'sentinel_api_key' );
    }

    public function options_page() {
        ?>
        <div class="wrap">
            <h1>Sentinel Connector Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields( 'sentinel_options' ); ?>
                <?php do_settings_sections( 'sentinel_options' ); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Sentinel API URL</th>
                        <td><input type="text" name="sentinel_api_url" value="<?php echo esc_attr( get_option('sentinel_api_url') ); ?>" class="regular-text" placeholder="https://your-sentinel-app.com/api/webhook" /></td>
                    </tr>
                    <tr valign="top">
                        <th scope="row">Sentinel Secret Key</th>
                        <td><input type="password" name="sentinel_api_key" value="<?php echo esc_attr( get_option('sentinel_api_key') ); ?>" class="regular-text" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function send_data( $event, $payload ) {
        if ( empty( $this->api_url ) ) return;

        $body = array(
            'event'   => $event,
            'source'  => get_bloginfo( 'name' ),
            'payload' => $payload,
            'timestamp' => current_time( 'mysql' )
        );

        $args = array(
            'body'        => json_encode( $body ),
            'headers'     => array(
                'Content-Type' => 'application/json',
                'X-Sentinel-Key' => $this->api_key
            ),
            'timeout'     => 45,
            'blocking'    => true, // Make async (false) in production for performance
        );

        wp_remote_post( $this->api_url, $args );
    }

    public function send_order_to_sentinel( $order_id ) {
        if ( ! $order_id ) return;
        $order = wc_get_order( $order_id );
        
        $data = array(
            'id' => $order_id,
            'total' => $order->get_total(),
            'currency' => $order->get_currency(),
            'status' => $order->get_status(),
            'customer' => array(
                'email' => $order->get_billing_email(),
                'first_name' => $order->get_billing_first_name(),
                'last_name' => $order->get_billing_last_name(),
            ),
            'items' => array()
        );

        foreach ( $order->get_items() as $item_id => $item ) {
            $data['items'][] = array(
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'total' => $item->get_total()
            );
        }

        $this->send_data( 'new_order', $data );
    }

    public function send_user_to_sentinel( $user_id ) {
        $user = get_userdata( $user_id );
        $data = array(
            'id' => $user_id,
            'email' => $user->user_email,
            'username' => $user->user_login,
            'registered' => $user->user_registered
        );
        $this->send_data( 'new_user', $data );
    }
}

new Sentinel_Connector();
