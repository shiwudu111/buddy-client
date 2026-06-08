/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You
 shall not use Cocos Creator software for developing other software or tools
 that's used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to
 you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
#include "Game.h"

#include <algorithm>
#include <sstream>
#include "platform/FileUtils.h"
#include "renderer/pipeline/GlobalDescriptorSetManager.h"

#if CC_PLATFORM == CC_PLATFORM_ANDROID
    #include "platform/android/adpf_manager.h"
#endif
extern "C" void cc_load_all_plugins(); // NOLINT

#ifndef GAME_NAME
#define GAME_NAME "CocosGame";
#endif

#ifndef SCRIPT_XXTEAKEY
#define SCRIPT_XXTEAKEY "";
#endif

Game::Game() = default;

namespace {
constexpr char HOT_UPDATE_NATIVE_SEARCH_PATHS_FILE[] = "buddy-hot-update-search-paths.txt";

ccstd::string trimSearchPath(const ccstd::string &value) {
  const auto first = value.find_first_not_of(" \t\r\n");
  if (first == ccstd::string::npos) {
    return "";
  }
  const auto last = value.find_last_not_of(" \t\r\n");
  return value.substr(first, last - first + 1);
}

bool containsSearchPath(const ccstd::vector<ccstd::string> &paths, const ccstd::string &path) {
  return std::find(paths.begin(), paths.end(), path) != paths.end();
}

void restoreBuddyHotUpdateSearchPaths() {
  auto *fileUtils = cc::FileUtils::getInstance();
  if (fileUtils == nullptr) {
    return;
  }

  const auto searchPathsFile = fileUtils->getWritablePath() + HOT_UPDATE_NATIVE_SEARCH_PATHS_FILE;
  if (!fileUtils->isFileExist(searchPathsFile)) {
    return;
  }

  const auto content = fileUtils->getStringFromFile(searchPathsFile);
  if (content.empty()) {
    return;
  }

  ccstd::vector<ccstd::string> nextSearchPaths;
  std::istringstream stream(content);
  std::string line;
  while (std::getline(stream, line)) {
    const auto path = trimSearchPath(line);
    if (!path.empty() && !containsSearchPath(nextSearchPaths, path)) {
      nextSearchPaths.emplace_back(path);
    }
  }

  for (const auto &path : fileUtils->getSearchPaths()) {
    if (!path.empty() && !containsSearchPath(nextSearchPaths, path)) {
      nextSearchPaths.emplace_back(path);
    }
  }

  if (!nextSearchPaths.empty()) {
    fileUtils->setSearchPaths(nextSearchPaths);
  }
}
} // namespace

int Game::init() {
  _windowInfo.title = GAME_NAME;
  // configurate window size
  // _windowInfo.height = 600;
  // _windowInfo.width  = 800;

#if CC_DEBUG
  _debuggerInfo.enabled = true;
#else
  _debuggerInfo.enabled = false;
#endif
  _debuggerInfo.port = 6086;
  _debuggerInfo.address = "0.0.0.0";
  _debuggerInfo.pauseOnStart = false;

  _xxteaKey = SCRIPT_XXTEAKEY;

  cc::pipeline::GlobalDSManager::setDescriptorSetLayout();
  cc_load_all_plugins();

#if (CC_PLATFORM == CC_PLATFORM_ANDROID) && CC_SUPPORT_ADPF
  cc::ADPFManager::getInstance().initialize();
#endif

  if (_debuggerInfo.enabled) {
    setDebugIpAndPort(_debuggerInfo.address, _debuggerInfo.port, _debuggerInfo.pauseOnStart);
  }

  int ret = cc::CocosApplication::init();
  if (ret != 0) {
    return ret;
  }

  setXXTeaKey(_xxteaKey);
  runScript("jsb-adapter/web-adapter.js");
  restoreBuddyHotUpdateSearchPaths();
  runScript("main.js");
  return 0;
}

void Game::onPause() { BaseGame::onPause(); }

void Game::onResume() { BaseGame::onResume(); }

void Game::onClose() { BaseGame::onClose(); }

CC_REGISTER_APPLICATION(Game);
