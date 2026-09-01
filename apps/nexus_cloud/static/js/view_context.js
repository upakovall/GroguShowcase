/**
 * Declarative Semantic ViewContext Generator.
 * 
 * Aggregates current application state, active modals, and interactive
 * components into a strictly typed semantic ViewContext payload.
 * 
 * ZERO DOM/CSS TREE SCRAPING: Emits purely declarative semantic tokens.
 */

class ViewContextManager {
  constructor() {
    this.screenId = 'cloud_dashboard';
    this.title = 'Nexus Cloud Studio // Cluster Infrastructure';
  }

  /**
   * Generates a declarative snapshot of the current view and interactive elements.
   * @param {Object} appState Current application state store
   * @returns {Object} Strictly structured ViewContext conforming to backend Pydantic schema
   */
  generateSnapshot(appState) {
    const components = [
      {
        id: 'theme_toggle',
        type: 'switch',
        label: 'Platform Color Theme Toggle',
        value: appState.theme, // 'dark' or 'light'
        enabled: true,
        allowed_actions: ['toggle', 'click'],
        metadata: { current_theme: appState.theme }
      },
      {
        id: 'region_select',
        type: 'select',
        label: 'Target Cloud Deployment Region',
        value: appState.region,
        enabled: true,
        options: ['us-east-1', 'us-west-2', 'eu-central-1', 'ap-northeast-1'],
        allowed_actions: ['select_option', 'set_value']
      },
      {
        id: 'worker_nodes_input',
        type: 'input',
        label: 'Target Worker Nodes Capacity',
        value: appState.workerNodes,
        enabled: true,
        allowed_actions: ['set_value'],
        metadata: { min: 1, max: 32 }
      },
      {
        id: 'filter_status',
        type: 'select',
        label: 'Cluster Server Status Filter',
        value: appState.statusFilter,
        enabled: true,
        options: ['all', 'active', 'unhealthy'],
        allowed_actions: ['select_option', 'set_value', 'filter']
      },
      {
        id: 'autoscaling_switch',
        type: 'switch',
        label: 'Cluster Autoscaling Policy',
        value: appState.autoscaling,
        enabled: true,
        allowed_actions: ['toggle', 'click']
      },
      {
        id: 'server_table',
        type: 'table',
        label: 'Cluster Server Instances Table',
        value: {
          total_count: appState.servers.length,
          visible_count: appState.getVisibleServers().length,
          active_filter: appState.statusFilter
        },
        enabled: true,
        allowed_actions: ['filter', 'filter_table', 'reset_filters']
      },
      {
        id: 'deploy_modal_btn',
        type: 'button',
        label: 'Open Deployment Configuration Modal',
        enabled: true,
        allowed_actions: ['click', 'open_modal']
      },
      {
        id: 'reset_filters_btn',
        type: 'button',
        label: 'Reset All Filter Controls',
        enabled: true,
        allowed_actions: ['click', 'reset_filters']
      },
      {
        id: 'deploy_modal',
        type: 'modal',
        label: 'Deploy Production Cluster Preset Modal',
        value: appState.isDeployModalOpen,
        enabled: true,
        allowed_actions: ['open_modal', 'close_modal']
      }
    ];

    return {
      screen_id: this.screenId,
      title: this.title,
      active_modal: appState.isDeployModalOpen ? 'deploy_modal' : null,
      focused_element_id: appState.focusedElementId || null,
      components: components,
      state_summary: {
        theme: appState.theme,
        region: appState.region,
        worker_nodes: appState.workerNodes,
        autoscaling_enabled: appState.autoscaling,
        status_filter: appState.statusFilter,
        total_servers: appState.servers.length,
        visible_servers: appState.getVisibleServers().length,
      },
      timestamp: Date.now() / 1000
    };
  }
}

// Global export
window.ViewContextManager = ViewContextManager;
