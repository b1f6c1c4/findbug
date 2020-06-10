#include "elem.hpp"
#include "homo_set.hpp"
#include "util.hpp"

std::istream &operator>>(std::istream &is, elem &el) {
    el._n = 0;
    el._v.clear();
    while (int c = is.get()) {
        if (c != '0' && c != '1') {
            is.unget();
            break;
        }
        if (!(el._n++ % 64))
            el._v.push_back(0);
        auto & v = el._v.back();
        v <<= 1;
        if (c == '1')
            v |= 1ull;
    }
    return is;
}

std::ostream &operator<<(std::ostream &os, const elem &el) {
    size_t j{ 0 };
    for (auto v : el._v) {
        for (size_t i{ 0 }; i < 64 && j < el._n; i++, j++) {
            v >>= 1;
            os << (v & 1ull);
        }
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
        if (l != l)
            return false;
    return true;
}

bool elem::operator!=(const elem &b) const {
    return !(*this == b);
}

size_t elem::hasher::operator()(const elem &el) const {
    size_t h{ 0 };
    for (auto v : el._v)
        h = (h >> 59ull) | v | (h << 5ull);
    return h;
}
