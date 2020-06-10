#include "tri_set.hpp"

tri_set::const_info::const_info(const tri_set &bs, const elem &el) : _bs{ bs }, _el{ el } { }

template<bool UD>
bool tri_set::const_info::is() const {
    if constexpr (UD) {
        return is_true();
    } else {
        return is_false();
    }
}

bool tri_set::const_info::is_true() const {
    return _el >= _bs._us;
}

bool tri_set::const_info::is_false() const {
    return _el <= _bs._ds;
}

tri_set::info::info(tri_set &bs, const elem &el) : _bs{ bs }, _el{ el } { }

template<bool UD>
bool tri_set::info::is() const {
    if constexpr (UD) {
        return is_true();
    } else {
        return is_false();
    }
}

bool tri_set::info::is_true() const {
    return _el >= _bs._us;
}

bool tri_set::info::is_false() const {
    return _el <= _bs._ds;
}

const tri_set::const_info tri_set::operator[](const elem &el) const {
    return { *this, el };
}

tri_set::info tri_set::operator[](const elem &el) {
    return { *this, el };
}

const homo_set<true> &tri_set::get_us() const {
    return _us;
}

const homo_set<false> &tri_set::get_ds() const {
    return _ds;
}

const typename tri_set::set_t &tri_set::get_zs() const {
    return _zs;
}

const tri_set::set_t &tri_set::get_sup() const {
    return _sup;
}

const tri_set::set_t &tri_set::get_inf() const {
    return _inf;
}

template <bool UD>
void remove(std::unordered_set<elem, elem::hasher> &lst, const elem &el) {
    std::erase_if(lst, [&el](const elem &e){
        if constexpr (UD) {
            return e >= el;
        } else {
            return e <= el;
        }
    });
}

template <bool UD>
void dfs(std::unordered_set<elem, elem::hasher> &lst, const homo_set<UD> &pre, const elem &el0) {
    std::queue<elem> searching;
    searching.push(el0);
    while (!searching.empty()) {
        auto el = searching.front();
        searching.pop();
        if (UD) {
            for (const auto &e : el.downs())
                if (!(e >= el0))
                    lst.insert(e);
            for (const auto &e : el.ups())
                if (!(e >= pre))
                    searching.push(e);
        } else {
            for (const auto &e : el.ups())
                if (!(e <= el0))
                    lst.insert(e);
            for (const auto &e : el.downs())
                if (!(e <= pre))
                    searching.push(e);
        }
    }
}

tri_set::info &tri_set::info::operator=(bool val) {
    if (val) {
        if (is_false())
            throw std::exception{};
        if (!is_true()) {
            remove<true>(_bs._lb, _el);
            remove<true>(_bs._ub, _el);
            dfs(_bs._ub, _bs._us, _el);
            _bs._us += _el;
        }
    } else {
        if (is_true())
            throw std::exception{};
        if (!is_false()) {
            remove<false>(_bs._lb, _el);
            remove<false>(_bs._ub, _el);
            dfs(_bs._lb, _bs._ds, _el);
            _bs._ds += _el;
        }
    }
    return *this;
}

void tri_set::info::invalidate() {
    if (is_true() || is_false())
        throw std::exception{};
    _bs._zs.insert(_el);
    _bs.
}

#include <algorithm>
