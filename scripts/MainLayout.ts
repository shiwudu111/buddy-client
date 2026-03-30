/**
 * 主界面布局组件
 * 创建时间：2026-03-27 18:20
 */

import { apiClient } from './ApiClient';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  active: boolean;
}

export class MainLayout {
  private currentRoute: string = 'home';
  private menuItems: MenuItem[] = [
    { id: 'home', label: '首页', icon: '🏠', route: '/home', active: true },
    { id: 'pet', label: '我的宠物', icon: '🐶', route: '/pet', active: false },
    { id: 'homework', label: '作业', icon: '📚', route: '/homework', active: false },
    { id: 'chat', label: '对话', icon: '💬', route: '/chat', active: false },
    { id: 'parents', label: '家长', icon: '👨‍👩‍👧', route: '/parents', active: false },
    { id: 'profile', label: '我的', icon: '👤', route: '/profile', active: false },
  ];

  private userInfo: any = null;
  private petInfo: any = null;

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    // 检查登录状态
    if (!apiClient.isLoggedIn()) {
      this.redirectToLogin();
      return;
    }

    // 获取用户信息
    await this.loadUserInfo();
    
    // 获取宠物信息（如果有）
    await this.loadPetInfo();
    
    this.render();
  }

  /**
   * 跳转到登录页
   */
  private redirectToLogin(): void {
    console.log('未登录，跳转到登录页');
    // window.location.href = '/login';
  }

  /**
   * 加载用户信息
   */
  private async loadUserInfo(): Promise<void> {
    try {
      const result = await apiClient.getCurrentUser();
      if (result.success) {
        this.userInfo = result.data;
      } else {
        console.error('获取用户信息失败:', result.message);
      }
    } catch (error) {
      console.error('加载用户信息错误:', error);
    }
  }

  /**
   * 加载宠物信息
   * 逻辑：先尝试创建宠物，如果用户已有宠物则会有错误提示
   */
  private async loadPetInfo(): Promise<void> {
    try {
      // 先尝试创建宠物（新用户没有宠物）
      const createResult = await apiClient.createPet({ name: '我的小宠物' });
      
      if (createResult.success && createResult.data) {
        // 创建成功，保存petId到localStorage
        const petId = createResult.data.pet_id;
        this.petInfo = createResult.data;
        localStorage.setItem('pet_id', petId);
        console.log('创建宠物成功, petId:', petId);
      } else if (createResult.error && createResult.error.includes('只能创建一只')) {
        // 用户已有宠物，从localStorage获取petId
        const savedPetId = localStorage.getItem('pet_id');
        if (savedPetId) {
          const statusResult = await apiClient.getPetStatus(savedPetId);
          if (statusResult.success && statusResult.data) {
            this.petInfo = statusResult.data;
            console.log('获取已有宠物成功:', this.petInfo);
          }
        }
        console.log('用户已有宠物，已获取petId');
      }
    } catch (error) {
      console.error('加载宠物信息错误:', error);
      this.petInfo = null;
    }
  }

  /**
   * 喂养宠物
   */
  async feedPet(): Promise<void> {
    const petId = localStorage.getItem('pet_id');
    if (!petId) {
      console.error('没有宠物ID');
      return;
    }

    try {
      const result = await apiClient.feedPet(petId, 20);
      if (result.success && result.data) {
        this.petInfo = result.data;
        console.log('喂养成功:', result.data);
        this.render();
      } else {
        console.error('喂养失败:', result.error);
      }
    } catch (error) {
      console.error('喂养错误:', error);
    }
  }

  /**
   * 切换菜单
   */
  switchMenu(menuId: string): void {
    // 更新菜单激活状态
    this.menuItems.forEach(item => {
      item.active = item.id === menuId;
    });
    
    this.currentRoute = menuId;
    this.render();
    
    // 加载对应页面的内容
    this.loadPageContent(menuId);
  }

  /**
   * 加载页面内容
   */
  private loadPageContent(pageId: string): void {
    console.log(`加载页面: ${pageId}`);
    
    switch (pageId) {
      case 'home':
        this.renderHomePage();
        break;
      case 'pet':
        this.renderPetPage();
        break;
      case 'homework':
        this.renderHomeworkPage();
        break;
      case 'chat':
        this.renderChatPage();
        break;
      case 'parents':
        this.renderParentsPage();
        break;
      case 'profile':
        this.renderProfilePage();
        break;
      default:
        this.renderHomePage();
    }
  }

  /**
   * 渲染首页
   */
  private renderHomePage(): void {
    const contentElement = document.getElementById('page-content');
    if (!contentElement) return;

    const welcomeMessage = this.userInfo 
      ? `欢迎回来，${this.userInfo.username}！`
      : '欢迎使用学伴精灵！';

    contentElement.innerHTML = `
      <div class="home-page">
        <div class="welcome-section">
          <h1>${welcomeMessage}</h1>
          <p>今天是 ${new Date().toLocaleDateString('zh-CN')}</p>
        </div>
        
        <div class="quick-actions">
          <h2>快速操作</h2>
          <div class="action-grid">
            <div class="action-card" onclick="mainLayout.switchMenu('pet')">
              <div class="action-icon">🐶</div>
              <div class="action-label">查看宠物</div>
            </div>
            
            <div class="action-card" onclick="mainLayout.switchMenu('homework')">
              <div class="action-icon">📚</div>
              <div class="action-label">提交作业</div>
            </div>
            
            <div class="action-card" onclick="mainLayout.switchMenu('chat')">
              <div class="action-icon">💬</div>
              <div class="action-label">与宠物对话</div>
            </div>
            
            <div class="action-card" onclick="mainLayout.switchMenu('parents')">
              <div class="action-icon">👨‍👩‍👧</div>
              <div class="action-label">家长管理</div>
            </div>
          </div>
        </div>
        
        <div class="daily-tips">
          <h2>今日小贴士</h2>
          <div class="tip-card">
            <p>📝 记得每天完成作业，宠物会给你奖励哦！</p>
            <p>🍎 保持宠物饱食度，它会更开心地陪你学习</p>
            <p>💬 多和宠物聊天，它会越来越了解你</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染宠物页面
   */
  private renderPetPage(): void {
    const contentElement = document.getElementById('page-content');
    if (!contentElement) return;

    contentElement.innerHTML = `
      <div class="pet-page">
        <h1>我的宠物</h1>
        
        ${this.petInfo ? this.renderPetInfo() : this.renderNoPet()}
      </div>
    `;
  }

  /**
   * 渲染宠物信息
   */
  private renderPetInfo(): string {
    return `
      <div class="pet-card">
        <div class="pet-header">
          <div class="pet-avatar">🐶</div>
          <div class="pet-name">${this.petInfo.name}</div>
          <div class="pet-level">Lv. ${this.petInfo.level}</div>
        </div>
        
        <div class="pet-stats">
          <div class="stat-item">
            <div class="stat-label">经验值</div>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${this.petInfo.experience}%"></div>
            </div>
            <div class="stat-value">${this.petInfo.experience}/100</div>
          </div>
          
          <div class="stat-item">
            <div class="stat-label">饱食度</div>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${this.petInfo.hunger}%"></div>
            </div>
            <div class="stat-value">${this.petInfo.hunger}/100</div>
          </div>
          
          <div class="stat-item">
            <div class="stat-label">心情值</div>
            <div class="stat-bar">
              <div class="stat-fill" style="width: ${this.petInfo.mood}%"></div>
            </div>
            <div class="stat-value">${this.petInfo.mood}/100</div>
          </div>
        </div>
        
        <div class="pet-actions">
          <button class="action-btn" onclick="mainLayout.feedPet()">
            🍎 喂食
          </button>
          <button class="action-btn" onclick="mainLayout.playWithPet()">
            🎾 玩耍
          </button>
          <button class="action-btn" onclick="mainLayout.switchMenu('chat')">
            💬 聊天
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染无宠物状态
   */
  private renderNoPet(): string {
    return `
      <div class="no-pet">
        <div class="no-pet-icon">🐾</div>
        <h2>还没有宠物哦</h2>
        <p>创建你的第一个学习伙伴吧！</p>
        <button class="create-pet-btn" onclick="mainLayout.createPet()">
          创建宠物
        </button>
      </div>
    `;
  }

  /**
   * 渲染作业页面（占位）
   */
  private renderHomeworkPage(): void {
    const contentElement = document.getElementById('page-content');
    if (!contentElement) return;

    contentElement.innerHTML = `
      <div class="homework-page">
        <h1>作业管理</h1>
        <p>作业功能开发中...</p>
      </div>
    `;
  }

  /**
   * 渲染聊天页面（占位）
   */
  private renderChatPage(): void {
    const contentElement = document.getElementById('page-content');
    if (!contentElement) return;

    contentElement.innerHTML = `
      <div class="chat-page">
        <h1>与宠物对话</h1>
        <p>聊天功能开发中...</p>
      </div>
    `;
  }

  /**
   * 渲染家长页面（占位）
   */
  private renderParentsPage(): void {
    const contentElement = document.getElementById('page-content');
    if (!contentElement) return;

    contentElement.innerHTML = `
      <div class="parents-page">
        <h1>家长管理</h1>
        <p>家长功能开发中...</p>
      </div>
    `;
  }

  /**
   * 渲染个人资料页面（占位）
   */
  private renderProfilePage(): void {
    const contentElement = document.getElementById('page-content');
    if (!contentElement) return;

    contentElement.innerHTML = `
      <div class="profile-page">
        <h1>我的资料</h1>
        <p>个人资料功能开发中...</p>
      </div>
    `;
  }

  /**
   * 创建宠物
   */
  async createPet(): Promise<void> {
    const petName = prompt('请输入宠物名字：');
    if (!petName) return;

    try {
      const result = await apiClient.createPet({ name: petName });
      if (result.success) {
        this.petInfo = result.data;
        alert('宠物创建成功！');
        this.renderPetPage();
      } else {
        alert(`创建失败: ${result.message}`);
      }
    } catch (error) {
      console.error('创建宠物错误:', error);
      alert('创建宠物失败，请重试');
    }
  }

  /**
   * 喂食宠物
   */
  async feedPet(): Promise<void> {
    if (!this.petInfo) return;

    try {
      const result = await apiClient.feedPet(this.petInfo.id);
      if (result.success) {
        this.petInfo = result.data;
        alert('喂食成功！');
        this.renderPetPage();
      } else {
        alert(`喂食失败: ${result.message}`);
      }
    } catch (error) {
      console.error('喂食错误:', error);
      alert('喂食失败，请重试');
    }
  }

  /**
   * 与宠物玩耍
   */
  async playWithPet(): Promise<void> {
    if (!this.petInfo) return;

    try {
      const result = await apiClient.playWithPet(this.petInfo.id);
      if (result.success) {
        this.petInfo = result.data;
        alert('玩耍成功！');
        this.renderPetPage();
      } else {
        alert(`玩耍失败: ${result.message}`);
      }
    } catch (error) {
      console.error('玩耍错误:', error);
      alert('玩耍失败，请重试');
    }
  }

  /**
   * 退出登录
   */
  logout(): void {
    apiClient.logout();
    this.redirectToLogin();
  }

  /**
   * 渲染完整布局
   */
  render(): void {
    const appElement = document.getElementById('app');
    if (!appElement) return;

    appElement.innerHTML = `
      <div class="main-layout">
        <!-- 顶部导航 -->
        <header class="main-header">
          <div class="header-left">
            <div class="logo">🎮 学伴精灵</div>
          </div>
          <div class="header-right">
            ${this.userInfo ? `
              <div class="user-info">
                <span class="username">${this.userInfo.username}</span>
                <button class="logout-btn" onclick="mainLayout.logout()">退出</button>
              </div>
            ` : ''}
          </div>
        </header>
        
        <!-- 主要内容区域 -->
        <div class="main-content">
          <!-- 侧边菜单 -->
          <nav class="side-menu">
            ${this.menuItems.map(item => `
              <div 
                class="menu-item ${item.active ? 'active' : ''}"
                onclick="mainLayout.switchMenu('${item.id}')"
              >
                <span class="menu-icon">${item.icon}</span>
                <span class="menu-label">${item.label}</span>
              </div>
            `).join('')}
          </nav>
          
          <!-- 页面内容 -->
          <main class="page-content" id="page-content">
            <!-- 页面内容由 loadPageContent 方法填充 -->
          </main>
        </div>
        
        <!-- 底部信息 -->
        <footer class="main-footer">
          <p>© 2026 学伴精灵 - 让学习更有趣</p>
        </footer>
      </div>
    `;

    // 加载当前页面的内容
    this.loadPageContent(this.currentRoute);
  }
}

// 创建全局实例
export const mainLayout = new MainLayout();