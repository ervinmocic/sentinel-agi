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
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );

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

    public function register_rest_routes() {
        register_rest_route( 'sentinel/v1', '/stats', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'handle_stats_request' ),
            'permission_callback' => '__return_true', // we do our own header auth below
        ) );
    }

    private function authorize_request( $request ) {
        $key = $request->get_header( 'x-sentinel-key' );
        if ( empty( $this->api_key ) ) {
            return false;
        }
        return hash_equals( (string) $this->api_key, (string) $key );
    }

    public function handle_stats_request( $request ) {
        if ( ! $this->authorize_request( $request ) ) {
            return new WP_REST_Response( array( 'error' => 'Unauthorized' ), 401 );
        }

        if ( ! function_exists( 'stats_get_csv' ) ) {
            return new WP_REST_Response( array(
                'error' => 'Jetpack stats not available (stats_get_csv missing). Ensure Jetpack is installed and Stats is connected.'
            ), 400 );
        }

        $range = sanitize_text_field( $request->get_param( 'range' ) );
        if ( empty( $range ) ) $range = 'today';

        // Always fetch enough days to find the right date(s)
        $fetch_days = 31; 
        if ( $range === 'week' ) $fetch_days = 14; 
        if ( $range === 'today' ) $fetch_days = 7; 

        // Cache key includes date to auto-expire at midnight
        $today_date = current_time( 'Y-m-d' );
        $cache_key = 'sentinel_stats_' . md5( $range . '_' . $today_date );
        
        // For 'today', we want fresher data (1 min cache). Others can be 10 mins.
        $cache_time = ( $range === 'today' ) ? 60 : 10 * MINUTE_IN_SECONDS;

        $cached = get_transient( $cache_key );
        if ( false !== $cached ) {
            return new WP_REST_Response( $cached, 200 );
        }

        $rows = stats_get_csv( 'views', array( 'days' => $fetch_days, 'limit' => -1 ) );
        if ( ! is_array( $rows ) ) $rows = array();

        $total_views = 0;
        $total_visitors = 0;
        $debug_dates = array();

        foreach ( $rows as $row ) {
            // Jetpack returns 'date' as 'YYYY-MM-DD'
            $row_date = isset($row['date']) ? $row['date'] : '';
            if ( ! $row_date ) continue;

            // Normalize dates to ensure string comparison works
            $row_date_norm = date( 'Y-m-d', strtotime( $row_date ) );
            $today_date_norm = date( 'Y-m-d', strtotime( $today_date ) );

            $include = false;

            if ( $range === 'today' ) {
                if ( $row_date_norm === $today_date_norm ) $include = true;
            } elseif ( $range === 'week' || $range === '7d' ) {
                // Check if date is within last 7 days
                if ( $row_date_norm >= date( 'Y-m-d', strtotime( '-6 days', current_time( 'timestamp' ) ) ) ) {
                    $include = true;
                }
            } elseif ( $range === 'month' || $range === '30d' ) {
                if ( $row_date_norm >= date( 'Y-m-d', strtotime( '-29 days', current_time( 'timestamp' ) ) ) ) {
                    $include = true;
                }
            }

            if ( $include ) {
                if ( isset( $row['views'] ) ) $total_views += intval( $row['views'] );
                if ( isset( $row['visitors'] ) ) $total_visitors += intval( $row['visitors'] );
                $debug_dates[] = $row_date;
            }
        }

        // Capture the last row for debugging/fallback context
        $last_row = end( $rows );
        
        $payload = array(
            'source' => 'jetpack',
            'range' => $range,
            'totals' => array(
                'views' => $total_views,
                'visitors' => $total_visitors,
            ),
            'meta' => array(
                'site_date' => $today_date,
                'included_dates' => $debug_dates,
                'last_available_entry' => $last_row ? $last_row : null,
                'generated_at' => current_time( 'mysql' ),
            )
        );

        set_transient( $cache_key, $payload, $cache_time );

        return new WP_REST_Response( $payload, 200 );
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
