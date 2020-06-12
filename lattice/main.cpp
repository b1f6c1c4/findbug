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

#ifndef EMSCRIPTEN

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

#else

#include <sstream>
#include <emscripten.h>
#include <emscripten/bind.h>

tri_set ts;
set_t running;

auto mark_true(std::string s) {
    elem e;
    e.set_size(s.length());
    std::stringstream ss{ s };
    ss >> e;
    running.erase(e);
    return ts.mark_true(e);
};

auto mark_false(std::string s) {
    elem e;
    e.set_size(s.length());
    std::stringstream ss{ s };
    ss >> e;
    running.erase(e);
    return ts.mark_false(e);
};

auto mark_improbable(std::string s) {
    elem e;
    e.set_size(s.length());
    std::stringstream ss{ s };
    ss >> e;
    running.erase(e);
    return ts.mark_improbable(e);
};

std::vector<size_t> summary() {
    return {
            ts.get_us().size(),
            ts.get_sup().size(),
            ts.get_zs().size(),
            ts.get_inf().size(),
            ts.get_ds().size(),
            running.size(),
            ts.get_us().best_hier(),
            ts.get_ds().best_hier(),
    };
}

auto list_true() {
    std::vector<std::string> res;
    for (const auto &el : ts.get_us()) {
        std::stringstream ss;
        ss << el;
        res.push_back(ss.str());
    }
    return res;
}

auto list_suprema() {
    std::vector<std::string> res;
    for (const auto &el : ts.get_sup()) {
        std::stringstream ss;
        ss << el;
        res.push_back(ss.str());
    }
    return res;
}

auto list_improbable() {
    std::vector<std::string> res;
    for (const auto &el : ts.get_zs()) {
        std::stringstream ss;
        ss << el;
        res.push_back(ss.str());
    }
    return res;
}

auto list_infima() {
    std::vector<std::string> res;
    for (const auto &el : ts.get_inf()) {
        std::stringstream ss;
        ss << el;
        res.push_back(ss.str());
    }
    return res;
}

auto list_false() {
    std::vector<std::string> res;
    for (const auto &el : ts.get_ds()) {
        std::stringstream ss;
        ss << el;
        res.push_back(ss.str());
    }
    return res;
}

auto list_running() {
    std::vector<std::string> res;
    for (const auto &el : running) {
        std::stringstream ss;
        ss << el;
        res.push_back(ss.str());
    }
    return res;
}

std::string next_u() {
    elem e;
    while ((e = ts.next_u()))
        if (running.insert(e).second)
            break;
    if (!e)
        return {};

    std::stringstream ss;
    ss << e;
    return ss.str();
}

std::string next_d() {
    elem e;
    while ((e = ts.next_d()))
        if (running.insert(e).second)
            break;
    if (!e)
        return {};

    std::stringstream ss;
    ss << e;
    return ss.str();
}

auto cancelled() {
    std::vector<std::string> res;
    std::erase_if(running, [&res](const elem &e){
        auto c = ts.is_decided(e);
        if (c) {
            std::stringstream ss;
            ss << c;
            res.push_back(ss.str());
        }
        return c;
    });
    return res;
}

void finalize() {
    ts.check_all();
}

EMSCRIPTEN_BINDINGS(lattice) {
    using namespace emscripten;

    function("mark_true", &mark_true);
    function("mark_false", &mark_false);
    function("mark_improbable", &mark_improbable);
    function("summary", &summary);
    function("list_true", &list_true);
    function("list_suprema", &list_suprema);
    function("list_improbable", &list_improbable);
    function("list_infima", &list_infima);
    function("list_false", &list_false);
    function("list_running", &list_running);
    function("next_u", &next_u);
    function("next_d", &next_d);
    function("cancelled", &cancelled);
    function("finalize", &finalize);

    register_vector<size_t>("vector<size_t>");
    register_vector<std::string>("vector<string>");
}

#endif // EMSCRIPTEN
