#include "elem.hpp"
#include <bit>
#include <algorithm>
#include "homo_set.hpp"
#include "util.hpp"

std::istream &operator>>(std::istream &is, elem &el) {
    el._v.clear();
    el._v.resize(SZ(el._n), 0ull);
    for (size_t i{ 0 }; i < el._n; i++) {
        auto c = is.get();
        if (c != '0' && c != '1') {
            i--;
            continue;
        }
        if (c == '1') {
            el._v[i / 64ull] |= 1ull << (i % 64ull);
        }
    }
    return is;
}

std::ostream &operator<<(std::ostream &os, const elem &el) {
    for (size_t i{ 0 }; i < el._n; i++) {
        auto v = el._v[i / 64ull];
        os << ((v & (1ull << (i % 64ull))) ? '1' : '0');
    }
    return os;
}

elem elem::top(size_t N) {
    elem el;
    el._n = N;
    el._v.resize(SZ(N), ~0ull);
    if (N % 64ull)
        el._v.back() &= (1ull << N % 64ull) - 1ull;
    return el;
}

elem elem::bottom(size_t N) {
    elem el;
    el._n = N;
    el._v.resize(SZ(N), 0ull);
    return el;
}

elem &elem::operator&=(const elem &b) {
    for (decltype(auto) lr : zip(_v, b._v))
        std::get<0>(lr) &= std::get<1>(lr);
    return *this;
}

elem &elem::operator|=(const elem &b) {
    for (decltype(auto) lr : zip(_v, b._v))
        std::get<0>(lr) |= std::get<1>(lr);
    return *this;
}

elem elem::operator&(const elem &b) const {
    elem el;
    el._n = _n;
    el._v.reserve(SZ(_n));
    for (const auto &[l, r] : zip(_v, b._v))
        el._v.push_back(l & r);
    return el;
}

elem elem::operator|(const elem &b) const {
    elem el;
    el._n = _n;
    el._v.reserve(SZ(_n));
    for (const auto &[l, r] : zip(_v, b._v))
        el._v.push_back(l | r);
    return el;
}

bool elem::operator>=(const elem &b) const {
    for (const auto &[l, r]: zip(_v, b._v))
        if ((l & r) != r)
            return false;
    return true;
}

bool elem::operator<=(const elem &b) const {
    for (const auto &[l, r]: zip(_v, b._v))
        if ((l & r) != l)
            return false;
    return true;
}

elem::iters<true> elem::ups() const {
    return { *this };
}

elem::iters<false> elem::downs() const {
    return { *this };
}

bool elem::operator==(const elem &b) const {
    for (const auto &[l, r]: zip(_v, b._v))
        if (l != r)
            return false;
    return true;
}

bool elem::operator!=(const elem &b) const {
    return !(*this == b);
}

void elem::set_size(size_t N) {
    _n = N;
}

size_t elem::get_size() const {
    return _n;
}

size_t elem::hier() const {
    size_t h{ 0 };
    for (const auto &v : _v)
        h += std::popcount(v);
    return h;
}

size_t elem::hasher::operator()(const elem &el) const {
    size_t h{ 0 };
    for (auto v : el._v)
        h = (h >> 59ull) | v | (h << 5ull);
    return h;
}
