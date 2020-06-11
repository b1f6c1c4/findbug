#include "tri_set.hpp"

size_t tri_set::aelem::prog() const {
    return _ud ? hier() : _n - hier();
}

tri_set::aelem::aelem(const elem &el, bool ud) : elem{ el }, _ud{ ud } { }

bool tri_set::aelem_hier_cmp::operator()(const aelem &l, const aelem &r) const {
    return l.prog() > r.prog();
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
        if (!(e >= _us || _zs.contains(e)))
            return;
    _sup.insert(el);
}

void tri_set::check_inf(const elem &el) {
    // Note: el should be TRUE before proceed
    for (const auto &e : el.downs())
        if (!(e <= _ds || _zs.contains(e)))
            return;
    _inf.insert(el);
}

bool tri_set::mark_true(const elem &el) {
    if (el <= _ds)
        return false;

    set_t searched;
    std::queue<elem> searching;
    searching.push(el);
    while (!searching.empty()) {
        auto ex = searching.front();
        searching.pop();
        for (const auto &e : ex.downs())
            if (!(e >= el))
                _q.emplace(e, true);
        for (const auto &e : ex.ups())
            if (!(e >= _us) && !searched.contains(e)) {
            searched.insert(e);
            searching.push(e);
        }
    }

    _us += el;
    check_inf(el);
    for (const auto &e : el.downs())
        if (e <= _ds)
            check_sup(e);

    return true;
}

bool tri_set::mark_false(const elem &el) {
    if (el >= _us)
        return false;

    set_t searched;
    std::queue<elem> searching;
    searching.push(el);
    while (!searching.empty()) {
        auto ex = searching.front();
        searching.pop();
        for (const auto &e : ex.ups())
            if (!(e <= el))
                _q.emplace(e, false);
        for (const auto &e : ex.downs())
            if (!(e <= _ds) && !searched.contains(e)) {
                searched.insert(e);
                searching.push(e);
            }
    }

    _ds += el;
    check_sup(el);
    for (const auto &e : el.ups())
        if (e >= _us)
            check_inf(e);

    return true;
}

bool tri_set::mark_improbable(const elem &el) {
    if (el >= _us || el <= _ds)
        return false;

    _zs.insert(el);
    for (const auto &e : el.ups())
        if (e >= _us)
            check_inf(e);
    for (const auto &e : el.downs())
        if (e <= _ds)
            check_sup(e);

    return true;
}

elem tri_set::next() {
    while (!_q.empty()) {
        elem el{ _q.top() };
        _q.pop();
        if (el >= _us || el <= _ds || _zs.contains(el))
            continue;
        return el;
    }
    return {};
}

bool tri_set::is_decided(const elem &el) const {
    return el >= _us || el <= _ds;
}

void tri_set::check_all() {
    for (const auto &el : _us)
        check_inf(el);
    for (const auto &el : _ds)
        check_sup(el);
}
