/**
 * Semantic UIAction Dispatcher.
 * 
 * Dispatches structured UIActions received from the Voice AI Copilot directly
 * to the application store. Operates without any DOM tree parsing or CSS selector scraping.
 */

export class ActionDispatcher {
  constructor(appStore) {
    this.appStore = appStore;
    this.actionHistory = [];
  }

  /**
   * Dispatches a single UIAction.
   * @param {Object} action Structured UIAction conforming to Pydantic model
   * @returns {Object} Execution outcome { success: boolean, message: string }
   */
  dispatch(action) {
    console.log('[ActionDispatcher] Executing UIAction:', action);
    this.recordAction(action);

    try {
      switch (action.action_type) {
        case 'TOGGLE_SWITCH':
          return this.handleToggleSwitch(action);

        case 'FILTER_TABLE':
          return this.handleFilterTable(action);

        case 'SET_INPUT_VALUE':
          return this.handleSetInputValue(action);

        case 'SELECT_OPTION':
          return this.handleSelectOption(action);

        case 'OPEN_MODAL':
          return this.handleOpenModal(action);

        case 'CLOSE_MODAL':
          return this.handleCloseModal(action);

        case 'RESET_FILTERS':
          return this.handleResetFilters(action);

        case 'CLICK_BUTTON':
          return this.handleClickButton(action);

        case 'NOTIFY_USER':
          return this.handleNotifyUser(action);

        default:
          console.warn('[ActionDispatcher] Unhandled action type:', action.action_type);
          return { success: false, message: `Unhandled action type: ${action.action_type}` };
      }
    } catch (err) {
      console.error('[ActionDispatcher] Action execution error:', err);
      return { success: false, message: err.message };
    }
  }

  handleToggleSwitch(action) {
    const { target_id, payload } = action;
    if (target_id === 'theme_toggle') {
      const targetTheme = payload.theme || (this.appStore.theme === 'dark' ? 'light' : 'dark');
      this.appStore.setTheme(targetTheme);
      return { success: true, message: `Theme set to ${targetTheme}` };
    }

    if (target_id === 'autoscaling_switch') {
      const targetState = payload.enabled !== undefined ? payload.enabled : !this.appStore.autoscaling;
      this.appStore.setAutoscaling(targetState);
      return { success: true, message: `Autoscaling set to ${targetState}` };
    }

    return { success: false, message: `Unknown switch target: ${target_id}` };
  }

  handleFilterTable(action) {
    const { payload } = action;
    const raw = (payload.status || payload.value || payload.filter || 'all').toLowerCase();
    let status = 'all';
    if (raw.includes('unhealthy') || raw.includes('неисправ') || raw.includes('неработ') || raw.includes('неактив') || raw.includes('error') || raw.includes('fail')) {
      status = 'unhealthy';
    } else if (raw.includes('active') || raw.includes('актив') || raw.includes('работа')) {
      status = 'active';
    } else {
      status = 'all';
    }
    this.appStore.setStatusFilter(status);
    return { success: true, message: `Updated active filter to ${filterValue}` };
  }

  handleSetInputValue(action) {
    const { target_id, payload } = action;
    if (target_id === 'worker_nodes_input') {
      const count = parseInt(payload.value, 10);
      if (!isNaN(count)) {
        this.appStore.setWorkerNodes(count);
        return { success: true, message: `Worker nodes set to ${count}` };
      }
    }
    return { success: false, message: `Could not set input for ${target_id}` };
  }

  handleSelectOption(action) {
    const { target_id, payload } = action;
    if (target_id === 'region_select') {
      const region = payload.value || payload.region;
      if (region) {
        this.appStore.setRegion(region);
        return { success: true, message: `Region set to ${region}` };
      }
    }
    if (target_id === 'filter_status') {
      const raw = (payload.value || payload.status || 'all').toLowerCase();
      let status = 'all';
      if (raw.includes('unhealthy') || raw.includes('неисправ') || raw.includes('неработ') || raw.includes('неактив') || raw.includes('error') || raw.includes('fail')) {
        status = 'unhealthy';
      } else if (raw.includes('active') || raw.includes('актив') || raw.includes('работа')) {
        status = 'active';
      } else {
        status = 'all';
      }
      this.appStore.setStatusFilter(status);
      return { success: true, message: `Status set to ${status}` };
    }
    return { success: false, message: `Unknown select target: ${target_id}` };
  }

  handleOpenModal(action) {
    this.appStore.setDeployModal(true);
    return { success: true, message: 'Deployment modal opened' };
  }

  handleCloseModal(action) {
    this.appStore.setDeployModal(false);
    return { success: true, message: 'Deployment modal closed' };
  }

  handleResetFilters(action) {
    this.appStore.resetFilters();
    return { success: true, message: 'All filters reset' };
  }

  handleClickButton(action) {
    const { target_id } = action;
    if (target_id === 'deploy_modal_btn') {
      this.appStore.setDeployModal(true);
      return { success: true, message: 'Opened modal via button click' };
    }
    if (target_id === 'reset_filters_btn') {
      this.appStore.resetFilters();
      return { success: true, message: 'Reset filters via button click' };
    }
    return { success: true, message: `Simulated click on ${target_id}` };
  }

  handleNotifyUser(action) {
    const msg = action.payload.message || action.description;
    this.appStore.showToast(msg);
    return { success: true, message: 'Notification displayed' };
  }

  recordAction(action) {
    this.actionHistory.unshift({
      action: action,
      timestamp: new Date().toLocaleTimeString()
    });
    this.renderActionFeed();
  }

  renderActionFeed() {
    const container = document.getElementById('action_feed_list');
    const badge = document.getElementById('action_count_tag');
    if (!container) return;

    if (badge) {
      badge.textContent = `${this.actionHistory.length} actions`;
    }

    if (this.actionHistory.length === 0) {
      container.innerHTML = '<div class="empty-feed">No actions executed yet.</div>';
      return;
    }

    container.innerHTML = this.actionHistory.map(item => `
      <div class="action-card-item">
        <div style="display: flex; justify-content: space-between;">
          <span class="action-type-badge">${item.action.action_type}</span>
          <span style="font-size: 0.65rem; color: var(--text-muted);">${item.timestamp}</span>
        </div>
        <div class="action-desc">${item.action.description}</div>
        ${item.action.target_id ? `<div class="action-target">Target: #${item.action.target_id}</div>` : ''}
      </div>
    `).join('');
  }
}

// Global export
window.ActionDispatcher = ActionDispatcher;
