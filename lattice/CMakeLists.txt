cmake_minimum_required(VERSION 3.16)
project(lattice)

if(EMSCRIPTEN)
    option(JS_ONLY "Compiles to native JS (No WASM)" OFF)
endif(EMSCRIPTEN)

add_compile_options(-Wall -Wextra -pedantic -Werror)
add_compile_options(-O3)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED True)

add_executable(lattice main.cpp util.hpp elem.hpp elem.cpp homo_set.hpp homo_set.cpp tri_set.hpp tri_set.cpp)

if(EMSCRIPTEN)
    message(STATUS "Using emcmake cmake")
    if(JS_ONLY)
        message(STATUS "Setting compilation target to native JavaScript")
        set(CMAKE_EXECUTABLE_SUFFIX ".js")
        set_target_properties(lattice PROPERTIES LINK_FLAGS "--bind -s WASM=0 -s MODULARIZE -s EXPORTED_RUNTIME_METHODS='[ccall]'")
    else(JS_ONLY)
        message(STATUS "Setting compilation target to WASM")
        set(CMAKE_EXECUTABLE_SUFFIX ".wasm.js")
        set_target_properties(lattice PROPERTIES LINK_FLAGS "--bind -s WASM=1 -s MODULARIZE -s EXPORTED_RUNTIME_METHODS='[ccall]'")
    endif(JS_ONLY)
else(EMSCRIPTEN)
    message(STATUS "Using regular cmake")
endif(EMSCRIPTEN)
