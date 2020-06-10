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
    bs.mark_true(elem::top(N));
    show(bs);
    bs.mark_false(elem::bottom(N));
    show(bs);
    while (true) {
        auto e = bs.next();
        if (!e)
            break;
        std::cout << e << "=? ";
        char ch;
        std::cin >> ch;
        if (ch == 't') {
            bs.mark_true(e);
        } else if (ch == 'f') {
            bs.mark_false(e);
        } else {
            bs.mark_improbable(e);
        }
        show(bs);
    }
    return 0;
}
