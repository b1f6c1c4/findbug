#ifndef LATTICE_TRI_SET_HPP
#define LATTICE_TRI_SET_HPP

#include <queue>
#include <unordered_set>
#include <list>
#include <memory>
#include "homo_set.hpp"

class tri_set {
    class aelem : public elem {
        bool _ud;
    public:
        aelem(const elem &el, bool ud);
        [[nodiscard]] size_t prog() const;
    };
    struct aelem_hier_cmp {
        bool operator()(const aelem &l, const aelem &r) const;
    };
    typedef std::priority_queue<aelem, std::vector<aelem>, aelem_hier_cmp> queue_t;

public:
    typedef std::unordered_set<elem, elem::hasher> set_t;

private:
    // List of supporting elements confirmed TRUE
    homo_set<true> _us;
    // List of supporting elements confirmed FALSE
    homo_set<false> _ds;
    // List of elements confirmed IMPROBABLE
    set_t _zs;

    // List of elements adjacent to TRUE and/or FALSE range
    // ... but may also contain invalid (already truthy/falsy) items
    queue_t _q;

    // List of suprema FALSE elements
    set_t _sup;
    // List of infima TRUE elements
    set_t _inf;

    void check_sup(const elem &el);
    void check_inf(const elem &el);

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

    elem next();

    void check_all();
};

#endif //LATTICE_TRI_SET_HPP
