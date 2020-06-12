#include <iostream>
#include <string>
#include "tri_set.hpp"

template <bool UD>
auto &operator<<(std::ostream &os, const homo_set<UD> &s) {
    for (const auto &e : s)
        os << e << std::endl;
    return os;
}

auto &operator<<(std::ostream &os, const set_t &s) {
    for (const auto &e : s)
        os << e << std::endl;
    return os;
}

int main(int argc, char **argv) {
    if (argc != 2) {
        std::cerr << "Usage: lattice <N>" << std::endl;
        return 2;
    }

    char *end;
    size_t N = std::strtoull(argv[1], &end, 10);
    tri_set ts;
    set_t running;

    while (!std::cin.eof()) {
        std::string line;
        std::getline(std::cin >> std::ws, line);

        if (line == "true") {
            elem e;
            e.set_size(N);
            std::cin >> e;
            running.erase(e);
            std::cout << ts.mark_true(e) << std::endl;
        } else if (line == "false") {
            elem e;
            e.set_size(N);
            std::cin >> e;
            running.erase(e);
            std::cout << ts.mark_false(e) << std::endl;
        } else if (line == "improbable") {
            elem e;
            e.set_size(N);
            std::cin >> e;
            running.erase(e);
            std::cout << ts.mark_improbable(e) << std::endl;
        } else if (line == "summary") {
            std::cout << ts.get_us().size() << std::endl;
            std::cout << ts.get_sup().size() << std::endl;
            std::cout << ts.get_zs().size() << std::endl;
            std::cout << ts.get_inf().size() << std::endl;
            std::cout << ts.get_ds().size() << std::endl;
            std::cout << running.size() << std::endl;
            std::cout << ts.get_us().best_hier() << std::endl;
            std::cout << ts.get_ds().best_hier() << std::endl;
        } else if (line == "list true") {
            std::cout << ts.get_us() << std::endl;
        } else if (line == "list suprema") {
            std::cout << ts.get_sup() << std::endl;
        } else if (line == "list improbable") {
            std::cout << ts.get_zs() << std::endl;
        } else if (line == "list infima") {
            std::cout << ts.get_inf() << std::endl;
        } else if (line == "list false") {
            std::cout << ts.get_ds() << std::endl;
        } else if (line == "list running") {
            std::cout << running << std::endl;
        } else if (line == "next u") {
            elem e;
            while ((e = ts.next_u()))
                if (running.insert(e).second)
                    break;
            if (e)
                std::cout << e << std::endl;
            else
                std::cout << std::endl;
        } else if (line == "next d") {
            elem e;
            while ((e = ts.next_d()))
                if (running.insert(e).second)
                    break;
            if (e)
                std::cout << e << std::endl;
            else
                std::cout << std::endl;
        } else if (line == "cancelled") {
            std::erase_if(running, [&ts](const elem &e){
                auto c = ts.is_decided(e);
                if (c)
                    std::cout << e << std::endl;
                return c;
            });
            std::cout << std::endl;
        } else if (line == "finalize") {
            ts.check_all();
            std::cout << std::endl;
        }
    }
}
