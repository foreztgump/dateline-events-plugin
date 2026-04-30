<?php
/**
 * PRO-333 — Seed demo events for EventON UX walkthrough on Site B
 *
 * Run via: ddev exec wp eval-file /path/to/seed-events.php 2>/dev/null
 * (path inside container = /var/www/html/... or absolute on mount)
 */

error_reporting(E_ERROR | E_PARSE);  // suppress deprecation noise

function seed_event(array $args): int {
    $pid = wp_insert_post([
        'post_type'    => 'ajde_events',
        'post_status'  => 'publish',
        'post_title'   => $args['title'],
        'post_content' => $args['content'],
    ]);
    if (is_wp_error($pid) || !$pid) {
        echo "FAILED: {$args['title']}\n";
        return 0;
    }
    foreach ($args['meta'] as $k => $v) {
        update_post_meta($pid, $k, $v);
    }
    if (!empty($args['terms'])) {
        foreach ($args['terms'] as $tax => $term) {
            wp_set_object_terms($pid, $term, $tax, false);
        }
    }
    echo "Created #{$pid}: {$args['title']}\n";
    return $pid;
}

// --- Taxonomy seed ---
foreach ([
    ['event_type', 'Conferences', 'Multi-day professional events'],
    ['event_type', 'Workshops', 'Hands-on training sessions'],
    ['event_type', 'Meetups', 'Community gatherings'],
    ['event_location', 'San Francisco', '123 Market St, San Francisco, CA'],
    ['event_location', 'New York', '555 Broadway, New York, NY'],
    ['event_location', 'Online', 'Virtual event via Zoom'],
    ['event_organizer', 'Dateline Research', ''],
    ['event_organizer', 'Acme Events', ''],
] as [$tax, $name, $desc]) {
    if (!term_exists($name, $tax)) {
        wp_insert_term($name, $tax, ['description' => $desc]);
    }
}

$tz = 'America/Los_Angeles';
$dtz = new DateTimeZone($tz);

function ts(string $when, DateTimeZone $tz): int {
    return (new DateTime($when, $tz))->getTimestamp();
}

// Event 1: Single-day featured conference
$e1_start = ts('+3 days 09:00', $dtz);
$e1_end   = ts('+3 days 18:00', $dtz);
seed_event([
    'title'   => 'Annual Tech Conference 2026',
    'content' => "Join us for our flagship developer conference featuring 30+ speakers across 4 tracks.\n\nLunch and networking included. Early bird tickets sold out.",
    'meta'    => [
        'evcal_srow'        => $e1_start,
        'evcal_erow'        => $e1_end,
        '_unix_start_ev'    => $e1_start,
        '_unix_end_ev'      => $e1_end,
        '_evo_tz'           => $tz,
        '_evo_date_format'  => 'Y/m/d',
        '_evo_time_format'  => '12h',
        '_status'           => 'published',
        '_featured'         => 'yes',
        'evcal_event_color' => '5d99e0',
    ],
    'terms' => [
        'event_type'      => 'Conferences',
        'event_location'  => 'San Francisco',
        'event_organizer' => 'Dateline Research',
    ],
]);

// Event 2: Multi-day workshop (3 days)
$e2_start = ts('+10 days 09:00', $dtz);
$e2_end   = ts('+12 days 17:00', $dtz);
seed_event([
    'title'   => 'Hands-on Kubernetes Workshop',
    'content' => "Three-day intensive workshop on Kubernetes operations, networking, and security.\n\nBring your laptop. Lunch provided.",
    'meta'    => [
        'evcal_srow'        => $e2_start,
        'evcal_erow'        => $e2_end,
        '_unix_start_ev'    => $e2_start,
        '_unix_end_ev'      => $e2_end,
        '_evo_tz'           => 'America/New_York',
        '_evo_date_format'  => 'Y/m/d',
        '_evo_time_format'  => '12h',
        '_status'           => 'published',
        'evcal_event_color' => 'e09b5d',
    ],
    'terms' => [
        'event_type'      => 'Workshops',
        'event_location'  => 'New York',
        'event_organizer' => 'Acme Events',
    ],
]);

// Event 3: Recurring weekly meetup (8 weeks)
$e3_start = ts('+17 days 18:00', $dtz);
$e3_end   = ts('+17 days 20:00', $dtz);
seed_event([
    'title'   => 'Weekly Developer Meetup',
    'content' => "Casual weekly get-together for developers. Drinks, snacks, lightning talks welcome.",
    'meta'    => [
        'evcal_srow'        => $e3_start,
        'evcal_erow'        => $e3_end,
        '_unix_start_ev'    => $e3_start,
        '_unix_end_ev'      => $e3_end,
        '_evo_tz'           => $tz,
        '_evo_date_format'  => 'Y/m/d',
        '_evo_time_format'  => '12h',
        '_status'           => 'published',
        'evcal_event_color' => '5de0a8',
        'evcal_repeat'      => 'yes',
        'evcal_rep_freq'    => 'weekly',
        'evcal_rep_gap'     => 1,
        'evcal_rep_num'     => 8,
        'evp_repeat_rb_wk'  => 'sing',
    ],
    'terms' => [
        'event_type'      => 'Meetups',
        'event_location'  => 'San Francisco',
        'event_organizer' => 'Dateline Research',
    ],
]);

// Event 4: Online webinar (with external link)
$e4_start = ts('+24 days 11:00', $dtz);
$e4_end   = ts('+24 days 13:00', $dtz);
seed_event([
    'title'   => 'Webinar: Modern WordPress Development',
    'content' => "Live online webinar covering modern PHP, REST API, and Gutenberg patterns.\n\nQ&A at the end. Recording will be sent to registered attendees.",
    'meta'    => [
        'evcal_srow'           => $e4_start,
        'evcal_erow'           => $e4_end,
        '_unix_start_ev'       => $e4_start,
        '_unix_end_ev'         => $e4_end,
        '_evo_tz'              => $tz,
        '_evo_date_format'     => 'Y/m/d',
        '_evo_time_format'     => '12h',
        '_status'              => 'published',
        'evcal_exlink'         => 'https://us02web.zoom.us/j/0000000000',
        '_evcal_exlink_target' => '_blank',
        '_evcal_exlink_option' => '1',
        'evcal_event_color'    => 'a05de0',
    ],
    'terms' => [
        'event_type'      => 'Workshops',
        'event_location'  => 'Online',
        'event_organizer' => 'Dateline Research',
    ],
]);

// Event 5: Cancelled event
$e5_start = ts('+30 days 09:00', $dtz);
$e5_end   = ts('+31 days 18:00', $dtz);
seed_event([
    'title'   => 'Spring Hackathon (Cancelled)',
    'content' => "This event has been cancelled due to venue unavailability. Refunds will be processed automatically.",
    'meta'    => [
        'evcal_srow'        => $e5_start,
        'evcal_erow'        => $e5_end,
        '_unix_start_ev'    => $e5_start,
        '_unix_end_ev'      => $e5_end,
        '_evo_tz'           => $tz,
        '_evo_date_format'  => 'Y/m/d',
        '_evo_time_format'  => '12h',
        '_status'           => 'cancelled',
        '_cancel_reason'    => 'Venue unavailable; rescheduling for Q3',
        'evcal_event_color' => 'e05d5d',
    ],
    'terms' => [
        'event_type'      => 'Conferences',
        'event_location'  => 'San Francisco',
        'event_organizer' => 'Acme Events',
    ],
]);

echo "\n✓ Seeded 5 demo events\n";
