#include <iostream>
#include "bi_set.hpp"

void show(const bi_set &bs) {
    std::cout << "Known T:";
    for (const auto &e : bs.get_us())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << "Upper Boundries:";
    for (const auto &e : bs.get_ub())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << "Lower Boundries:";
    for (const auto &e : bs.get_lb())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << "Known F:";
    for (const auto &e : bs.get_ds())
        std::cout << " " << e;
    std::cout << std::endl;
}

int main() {
    constexpr size_t N = 4;
    bi_set bs;
    show(bs);
    bs[elem::top(N)] = true;
    show(bs);
    bs[elem::bottom(N)] = false;
    show(bs);
    return 0;
}
