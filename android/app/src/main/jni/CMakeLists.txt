# Based on react-native/ReactAndroid/cmake-utils/default-app-setup/CMakeLists.txt.
# Copied into the app so we can compile custom Fabric component C++ (FastText measurement).

cmake_minimum_required(VERSION 3.13)

project(appmodules)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

target_sources(appmodules PRIVATE
  ${CMAKE_CURRENT_SOURCE_DIR}/fasttext/FastTextShadowNode.cpp
  ${CMAKE_CURRENT_SOURCE_DIR}/fasttext/FastTextMeasurementsManager.cpp
)

target_include_directories(appmodules PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
