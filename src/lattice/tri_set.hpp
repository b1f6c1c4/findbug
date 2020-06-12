#ifndef LATTICE_TRI_SET_HPP
#define LATTICE_TRI_SET_HPP

#include <queue>
#include <unordered_set>
#include <list>
#include <memory>
#include <algorithm>
#include "homo_set.hpp"

class tri_set {
    template <bool UD>
    class aelem : public elem {
        int64_t _bonus;
    public:
        aelem(const elem &el, int64_t bonus) : elem{ el }, _bonus{ bonus } { }
        struct hier_cmp {
            bool operator()(const aelem &l, const aelem &r) const {
                auto lp = (UD ? l.get_size() - l.hier() : l.hier()) + l._bonus;
                auto rp = (UD ? r.get_size() - r.hier() : r.hier()) + r._bonus;
                if (lp < rp)
                    return true;
                if (lp > rp)
                    return false;
                return std::lexicographical_compare(l._v.begin(), l._v.end(), r._v.begin(), r._v.end());
            }
        };
    };
    typedef std::priority_queue<aelem<true>, std::vector<aelem<true>>, aelem<true>::hier_cmp> uqueue_t;
    typedef std::priority_queue<aelem<false>, std::vector<aelem<false>>, aelem<false>::hier_cmp> dqueue_t;

private:
    size_t _n;

    // List of supporting elements confirmed TRUE
    homo_set<true> _us;
    // List of supporting elements confirmed FALSE
    homo_set<false> _ds;
    // List of elements confirmed IMPROBABLE
    set_t _zs;

    // 1) TRUE, supporting, non-inf
    // 2) IMPROBABLE
    // 3) Any 2 of _us elements &
    // 4) All _us elements &
    // 5) _us.ups().downs()
    uqueue_t _uq;
    // 1) FALSE, supporting, non-sup
    // 2) IMPROBABLE
    // 3) Any 2 of _ds elements |
    // 4) All _ds elements |
    // 5) _ds.downs().ups()
    dqueue_t _dq;

    // List of suprema FALSE elements
    set_t _sup;
    // List of infima TRUE elements
    set_t _inf;

    // Any modification towards _us/_ds will invalidate these
    // How many levels has been searched
    size_t _ud, _dd;
    // List of supporting TRUE + _ud
    // List of supporting FALSE - _dd
    set_t _ul, _dl;

    bool check_sup(const elem &el);
    bool check_inf(const elem &el);

public:
    [[nodiscard]] bool mark_true(const elem &el);
    [[nodiscard]] bool mark_false(const elem &el);
    [[nodiscard]] bool mark_improbable(const elem &el);

    [[nodiscard]] const homo_set<true> &get_us() const;
    [[nodiscard]] const homo_set<false> &get_ds() const;
    [[nodiscard]] const set_t &get_zs() const;
    [[nodiscard]] const set_t &get_sup() const;
    [[nodiscard]] const set_t &get_inf() const;

    [[nodiscard]] bool is_decided(const elem &el) const;

    elem next_u();
    elem next_d();

    void check_all();
};

#endif //LATTICE_TRI_SET_HPP
