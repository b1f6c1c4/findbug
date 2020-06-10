cmake_minimum_required(VERSION 3.16)
project(lattice)

set(CMAKE_CXX_STANDARD 17)

add_executable(lattice main.cpp elem.cpp elem.hpp util.hpp homo_set.hpp bi_set.hpp bi_set.cpp)