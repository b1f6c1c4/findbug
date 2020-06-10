cmake_minimum_required(VERSION 3.16)
project(lattice)

set(CMAKE_CXX_STANDARD 20)

add_executable(lattice main.cpp util.hpp elem.hpp elem.cpp homo_set.hpp homo_set.cpp tri_set.hpp tri_set.cpp)