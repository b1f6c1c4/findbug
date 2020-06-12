#include "tri_set.hpp"

const homo_set<true> &tri_set::get_us() const {
    return _us;
}

const homo_set<false> &tri_set::get_ds() const {
    return _ds;
}

const set_t &tri_set::get_zs() const {
    return _zs;
}

const set_t &tri_set::get_sup() const {
    return _sup;
}

const set_t &tri_set::get_inf() const {
    return _inf;
}

bool tri_set::check_sup(const elem &el) {
    // Note: el should be FALSE before proceed
    for (const auto &e : el.ups())
        if (!(e >= _us || _zs.contains(e)))
            return false;
    _sup.insert(el);
    return true;
}

bool tri_set::check_inf(const elem &el) {
    // Note: el should be TRUE before proceed
    for (const auto &e : el.downs())
        if (!(e <= _ds || _zs.contains(e)))
            return false;
    _inf.insert(el);
    return true;
}

bool tri_set::mark_true(const elem &el) {
    _n = el.get_size();
    if (el <= _ds)
        return false;

    _ud = 0;
    _ul.clear();
    _dd = 0;
    _dl.clear();

    _us += el;
    if (!check_inf(el)) {
        auto xa = el;
        for (const auto &e : _us) {
            auto x = el & e;
            xa &= e;
            if (!(x <= _ds) && !_zs.contains(x))
                _uq.emplace(x, 0ll);
        }
        if (!(xa <= _ds) && !_zs.contains(xa))
            _uq.emplace(xa, 0ll);
        for (const auto &e : el.downs())
            if (!(e <= _ds) && !_zs.contains(e))
                _uq.emplace(e, 0ll);
    }

    for (const auto &e : el.downs())
        if (_ds.contains(e))
            check_sup(e);

    return true;
}

bool tri_set::mark_false(const elem &el) {
    _n = el.get_size();
    if (el >= _us)
        return false;

    _ud = 0;
    _ul.clear();
    _dd = 0;
    _dl.clear();

    _ds += el;
    if (!check_sup(el)) {
        auto xa = el;
        for (const auto &e : _ds) {
            auto x = el | e;
            xa |= e;
            if (!(x >= _us) && !_zs.contains(x))
                _dq.emplace(x, 0ll);
        }
        if (!(xa >= _us) && !_zs.contains(xa))
            _dq.emplace(xa, 0ll);
        for (const auto &e : el.ups())
            if (!(e >= _us) && !_zs.contains(e))
                _dq.emplace(e, 0ll);
    }

    for (const auto &e : el.ups())
        if (_us.contains(e))
            check_inf(e);

    return true;
}

bool tri_set::mark_improbable(const elem &el) {
    _n = el.get_size();
    if (el >= _us || el <= _ds)
        return false;

    _ud = 0;
    _ul.clear();
    _dd = 0;
    _dl.clear();

    _zs.insert(el);
    for (const auto &e : el.downs())
        if (!(e <= _ds) && !_zs.contains(e))
            _uq.emplace(e, -(el.get_size() - el.hier()) / 2 - 1);
    for (const auto &e : el.ups())
        if (!(e >= _us) && !_zs.contains(e))
            _dq.emplace(e, -el.hier() / 2 - 1);

    for (const auto &e : el.ups())
        if (_us.contains(e))
            check_inf(e);
    for (const auto &e : el.downs())
        if (_ds.contains(e))
            check_sup(e);

    return true;
}

elem tri_set::next_u() {
    while (!_uq.empty()) {
        auto &el = _uq.top();
        _uq.pop();
        if (!(el >= _us || el <= _ds || _zs.contains(el)))
            return el;
    }

    if (_ud > _n)
        return {};

    const auto &curr = _ud ? _ul : _us;

    set_t next;
    for (const auto &el : curr)
        for (const elem &eu : el.ups()) {
            auto flag = true;
            for (const elem &e : _us)
                if (e != el && eu >= e) {
                    flag = false;
                    break;
                }
            if (!flag)
                continue;
            next.insert(eu);
            for (const elem &e : eu.downs())
                if (!(el >= _us || el <= _ds || _zs.contains(el)))
                    _uq.emplace(e, -_ud - 1ull);
        }

    _ud++;
    _ul = std::move(next);

    return next_u();
}

elem tri_set::next_d() {
    while (!_dq.empty()) {
        auto &el = _dq.top();
        _dq.pop();
        if (!(el >= _us || el <= _ds || _zs.contains(el)))
            return el;
    }

    if (_dd > _n)
        return {};

    const auto &curr = _dd ? _dl : _ds;

    set_t next;
    for (const auto &el : curr)
        for (const elem &ed : el.downs()) {
            auto flag = true;
            for (const elem &e : _ds)
                if (e != el && ed <= e) {
                    flag = false;
                    break;
                }
            if (!flag)
                continue;
            next.insert(ed);
            for (const elem &e : ed.ups())
                if (!(el >= _ds || el <= _ds || _zs.contains(el)))
                    _dq.emplace(e, -_dd - 1ull);
        }

    _dd++;
    _dl = std::move(next);

    return next_d();
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
