#include <iostream>
#include "tri_set.hpp"

void show(const tri_set &bs) {
    std::cout << "Known T:";
    for (const auto &e : bs.get_us())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << "Known sup:";
    for (const auto &e : bs.get_sup())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << "Known Improbable:";
    for (const auto &e : bs.get_zs())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << "Known inf:";
    for (const auto &e : bs.get_inf())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << "Known F:";
    for (const auto &e : bs.get_ds())
        std::cout << " " << e;
    std::cout << std::endl;

    std::cout << std::endl;
}

int main() {
    constexpr size_t N = 4;
    tri_set bs;
    show(bs);
    bs[elem::top(N)] = true;
    show(bs);
    bs[elem::bottom(N)] = false;
    show(bs);
    while (true) {
        auto e = bs.next();
        if (!e)
            break;
        std::cout << e << "=? ";
        char ch;
        std::cin >> ch;
        if (ch == 't') {
            bs[e] = true;
        } else if (ch == 'f') {
            bs[e] = false;
        } else {
            bs[e].invalidate();
        }
        show(bs);
    }
    return 0;
}
