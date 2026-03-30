/**
 * 学伴精灵 API 客户端 (修正版)
 * 严格按照文档要求，只实现8个核心接口
 * 创建时间：2026-03-27 19:30
 * 修正依据：文档《联调页面项目结构 V1.1》 + 后端实际接口
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  grade?: string;
  role: 'student' | 'parent';
  createdAt: string;
}

export interface Pet {
  id: string;
  name: string;
  level: number;
  experience: number;
  hunger: number;      // 饱食度 0-100
  mood: number;        // 心情值 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Homework {
  id: string;
  userId: string;
  subject: string;     // 科目：chinese, math, english
  content: string;     // 作业内容
  imageUrl?: string;   // 作业图片
  score?: number;      // 评分 0-100
  submittedAt: string;
}

export interface ChildPetStatus {
  pet: Pet;
  childName: string;
  lastActive: string;
}

class ApiClient {
  private baseUrl: string = 'http://localhost:3000/api/v1';
  private token: string | null = null;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    // 尝试从localStorage恢复token
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        this.token = savedToken;
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || `请求失败: ${response.status}`,
          code: response.status,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('API请求错误:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  // ==================== 8个核心接口 ====================

  /**
   * 1. 用户注册
   * 接口：POST /auth/register
   * 文档要求：✅ 已冻结
   */
  async register(params: {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    grade?: string;
    role?: 'student' | 'parent';
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 2. 用户登录
   * 接口：POST /auth/login
   * 文档要求：✅ 已冻结
   */
  async login(params: {
    username: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    if (result.success && result.data?.token) {
      this.token = result.data.token;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('auth_token', result.data.token);
      }
    }

    return result;
  }

  /**
   * 3. 创建宠物
   * 接口：POST /pets
   * 注意：后端路径是 /pets，不是 /pets/create
   */
  async createPet(params: { name: string }): Promise<ApiResponse<any>> {
    return this.request('/pets', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 4. 获取宠物状态
   * 接口：GET /pets/:petId
   * 注意：需要先有petId，无法直接获取当前用户的宠物
   */
  async getPetStatus(petId: string): Promise<ApiResponse<any>> {
    return this.request(`/pets/${petId}`);
  }

  /**
   * 5. 提交作业
   * 接口：POST /homeworks/submit
   * 后端路径：/api/v1/homeworks/submit
   */
  async submitHomework(params: {
    subject: string;
    content: string;
    imageUrl?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/homeworks/submit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * 6. 获取作业历史
   * 接口：GET /homeworks/history
   * 后端路径：/api/v1/homeworks/history
   */
  async getHomeworkHistory(params?: {
    page?: number;
    limit?: number;
    subject?: string;
  }): Promise<ApiResponse<any>> {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request(`/homeworks/history${query}`);
  }

  /**
   * 7. 喂养宠物
   * 接口：PATCH /pets/:petId/resources
   * 注意：需要petId和fullness_delta参数
   */
  async feedPet(petId: string, fullnessDelta: number = 20): Promise<ApiResponse<any>> {
    return this.request(`/pets/${petId}/resources`, {
      method: 'PATCH',
      body: JSON.stringify({
        fullness_delta: fullnessDelta,
        mood_delta: 5,
        growth_delta: 2
      }),
    });
  }

  /**
   * 8. 查看孩子宠物状态
   * 接口：GET /parent/children/:childId/pet
   */
  async getChildPetStatus(childId: string): Promise<ApiResponse<any>> {
    return this.request(`/parent/children/${childId}/pet`);
  }

  // ==================== 辅助接口 (文档未要求，但有用) ====================

  /**
   * 获取当前用户信息
   * 接口：GET /auth/me
   * 文档未要求，但有用
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/auth/me');
  }

  // ==================== 工具方法 ====================

  /**
   * 设置认证Token
   */
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * 获取当前Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    return !!this.token;
  }

  /**
   * 退出登录
   */
  logout(): void {
    this.token = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('auth_token');
    }
  }
}

// 导出单例实例
export const apiClient = new ApiClient();

export default ApiClient;