#ifndef LATTICE_ELEM_HPP
#define LATTICE_ELEM_HPP

#include <vector>
#include <iosfwd>
#include <cstdint>

#define SZ(N) ((N) + 63ull) / 64ull

template <bool UD>
class homo_set;

class elem {
protected:
    size_t _n;
    std::vector<uint64_t> _v;

public:
    friend std::istream &operator>>(std::istream &is, elem &el);
    friend std::ostream &operator<<(std::ostream &os, const elem &el);

    [[nodiscard]] static elem top(size_t N);
    [[nodiscard]] static elem bottom(size_t N);

    elem &operator&=(const elem &b);
    elem &operator|=(const elem &b);

    [[nodiscard]] elem operator&(const elem &b) const;
    [[nodiscard]] elem operator|(const elem &b) const;

    [[nodiscard]] bool operator>=(const elem &b) const;
    [[nodiscard]] bool operator<=(const elem &b) const;

    [[nodiscard]] bool operator==(const elem &b) const;
    [[nodiscard]] bool operator!=(const elem &b) const;

    template <bool UD>
    class iters {
        const elem &_el;
        iters(const elem &el);
    public:
        friend class elem;

        class iter {
            const elem &_el;
            size_t _i;
            iter(const elem &el, size_t i);
        public:
            friend class iters;
            elem operator*() const;
            bool operator==(const iter &o) const;
            bool operator!=(const iter &o) const;
            iter &operator++();
            const iter operator++(int);
        };

        [[nodiscard]] iter begin() const;
        [[nodiscard]] iter end() const;
    };

    [[nodiscard]] iters<true> ups() const;
    [[nodiscard]] iters<false> downs() const;

    template <bool UD>
    [[nodiscard]] bool operator<=(const homo_set<UD> &s) const;

    template <bool UD>
    [[nodiscard]] bool operator>=(const homo_set<UD> &s) const;

    struct hasher {
        size_t operator()(const elem &el) const;
    };

    [[nodiscard]] constexpr operator bool() const { return _n; }
    void set_size(size_t N);

    [[nodiscard]] size_t hier() const;
};

std::istream &operator>>(std::istream &is, elem &el);
std::ostream &operator<<(std::ostream &os, const elem &el);

template<bool UD>
bool elem::operator<=(const homo_set<UD> &s) const {
    return s >= *this;
}

template<bool UD>
bool elem::operator>=(const homo_set<UD> &s) const {
    return s <= *this;
}

template <bool UD>
elem::iters<UD>::iter::iter(const elem &el, size_t i) : _el{ el }, _i{ i } { }

template <bool UD>
elem elem::iters<UD>::iter::operator*() const {
    auto el = elem{ _el };
    auto &v = el._v[_i / 64ull];
    v ^= 1ull << (_i % 64ull);
    return el;
}

template <bool UD>
bool elem::iters<UD>::iter::operator==(const elem::iters<UD>::iter &o) const {
    return _i == o._i;
}

template <bool UD>
bool elem::iters<UD>::iter::operator!=(const elem::iters<UD>::iter &o) const {
    return _i != o._i;
}

template <bool UD>
typename elem::iters<UD>::iter &elem::iters<UD>::iter::operator++() {
    while (++_i < _el._n)
        if (((_el._v[_i / 64ull] & (1ull << (_i % 64ull))) != 0) ^ UD)
            break;
    return *this;
}

template <bool UD>
const typename elem::iters<UD>::iter elem::iters<UD>::iter::operator++(int) {
    auto it = *this;
    ++*this;
    return it;
}

template <bool UD>
elem::iters<UD>::iters(const elem &el) : _el{ el } { }

template <bool UD>
typename elem::iters<UD>::iter elem::iters<UD>::begin() const {
    auto it = iter{ _el, 0 };
    return (!(_el._v.front() & 1ull) ^ UD) ? ++it : it;
}

template <bool UD>
typename elem::iters<UD>::iter elem::iters<UD>::end() const { return { _el, _el._n }; }


#endif //LATTICE_ELEM_HPP
