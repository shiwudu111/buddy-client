import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type { ApiResponse, PetResourcesPayload, PetStatus } from "../types/api";

class PetService {
  async refreshCurrentPet(): Promise<ApiResponse<PetStatus>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    const result = await apiClient.getPetStatus(petId);
    if (result.success && result.data) {
      appState.setPetId(result.data.pet_id);
      appState.setCurrentPet(result.data);
    }
    return result;
  }

  async createPet(name = "Buddy"): Promise<ApiResponse<PetStatus>> {
    const result = await apiClient.createPet(name);
    if (result.success && result.data) {
      appState.setPetId(result.data.pet_id);
      appState.setCurrentPet(result.data);
    }
    return result;
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

    const petResult = await this.refreshCurrentPet();
    return petResult.success ? petResult : updateResult;
  }
}

export const petService = new PetService();
