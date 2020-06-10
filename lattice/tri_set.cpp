#include "tri_set.hpp"
#include <algorithm>

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

void tri_set::check_sup(const elem &el) {
    // Note: el should be FALSE before proceed
    for (const auto &e : el.ups())
        if (e <= _ds)
            return;
    _sup.insert(el);
}

void tri_set::check_inf(const elem &el) {
    // Note: el should be TRUE before proceed
    for (const auto &e : el.downs())
        if (e >= _us)
            return;
    _inf.insert(el);
}

void tri_set::enqueue(const elem &el) {
    auto it = _qe.find(std::make_shared<elem>(el));
    if (it != _qe.end())
}

void tri_set::mark_true(const elem &el) {
    if (el <= _ds)
        throw std::exception{};

    std::erase_if(_qe, [&el](const pelem &pe) {
        return *pe >= el;
    });

    std::queue<elem> searching;
    searching.push(el);
    while (!searching.empty()) {
        auto ex = searching.front();
        searching.pop();
        for (const auto &e : ex.downs())
            if (!(e >= el))
                enqueue(e);
        for (const auto &e : el.ups())
            if (!(e >= _us))
                searching.push(e);
    }

    _us += el;
    check_sup(el);
}

void tri_set::mark_false(const elem &el) {
    if (el >= _us)
        throw std::exception{};

    std::erase_if(_qe, [&el](const pelem &pe) {
        return *pe <= el;
    });

    std::queue<elem> searching;
    searching.push(el);
    while (!searching.empty()) {
        auto ex = searching.front();
        searching.pop();
        for (const auto &e : ex.ups())
            if (!(e <= el))
                enqueue(e);
        for (const auto &e : el.downs())
            if (!(e <= _ds))
                searching.push(e);
    }

    _us += el;
    check_inf(el);
}

void tri_set::mark_improbable(const elem &el) {
    if (is_true() || is_false())
        throw std::exception{};
    _bs._zs.insert(_el);
    _bs.
}

template <bool UD>
void dfs(typename tri_set::set_t &lst, const homo_set<UD> &pre, const elem &el0) {
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
        _bs.mark_true(_el);
    } else {
        _bs.mark_false(_el);
    }
    return *this;
}

void tri_set::info::invalidate() {
    _bs.mark_improbable(_el);
}
