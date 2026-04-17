import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type { ApiResponse, PetEvolutionPayload, PetResourcesPayload, PetStatus } from "../types/api";

class PetService {
  async refreshCurrentPet(canCommit?: () => boolean): Promise<ApiResponse<PetStatus>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    const result = await apiClient.getPetStatus(petId);
    if (result.success && result.data && (!canCommit || canCommit())) {
      appState.setPetId(result.data.pet_id);
      appState.setCurrentPet(result.data);
      return result;
    }

    if (result.statusCode === 404 && (!canCommit || canCommit())) {
      appState.clearPetState();
    }

    return result;
  }

  async getCurrentPetEvolution(): Promise<ApiResponse<PetEvolutionPayload>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    return apiClient.getPetEvolution(petId);
  }

  async createPet(name = "Buddy"): Promise<ApiResponse<PetStatus>> {
    return apiClient.createPet(name);
  }

  async feedCurrentPet(): Promise<ApiResponse<PetResourcesPayload | PetStatus>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "请先创建宠物",
      };
    }

    const updateResult = await apiClient.updatePetResources(petId, {
      fullness_delta: 15,
      mood_delta: 5,
      growth_delta: 0,
      reason: "manual_feed",
    });

    if (!updateResult.success) {
      return updateResult;
    }

    // 喂养接口已经返回了最新资源值，先把本地宠物状态即时更新，
    // 这样主界面能立刻看到变化，不必完全依赖后续状态接口是否有延迟。
    const currentPet = appState.getCurrentPet();
    if (currentPet && updateResult.data) {
      appState.setCurrentPet({
        ...currentPet,
        hunger: updateResult.data.hunger,
        mood: updateResult.data.mood,
        experience: updateResult.data.experience,
        status: updateResult.data.status,
      });
    }

    return updateResult;
  }
}

export const petService = new PetService();
