#ifndef LATTICE_TRI_SET_HPP
#define LATTICE_TRI_SET_HPP

#include <queue>
#include <unordered_set>
#include <list>
#include <memory>
#include "homo_set.hpp"

class tri_set {
public:
    struct elem_hier_cmp {
        bool operator()(const elem &l, const elem &r) const {
            return l.hier() < r.hier();
        }
    };
    typedef std::unordered_set<elem, elem::hasher> set_t;
    typedef std::priority_queue<elem, std::vector<elem>, elem_hier_cmp> queue_t;

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
    void mark_true(const elem &el);
    void mark_false(const elem &el);
    void mark_improbable(const elem &el);

public:
    class const_info {
        const tri_set &_bs;
        const elem &_el;
        const_info(const tri_set &bs, const elem &el);
    public:
        friend class tri_set;
        template <bool UD>
        bool is() const;
        bool is_true() const;
        bool is_false() const;
    };

    class info {
        tri_set &_bs;
        const elem &_el;
        info(tri_set &bs, const elem &el);
    public:
        friend class tri_set;
        template <bool UD>
        bool is() const;
        bool is_true() const;
        bool is_false() const;
        info &operator=(bool val);
        void invalidate();
    };

    [[nodiscard]] const const_info operator[](const elem &el) const;
    [[nodiscard]] info operator[](const elem &el);

    [[nodiscard]] const homo_set<true> &get_us() const;
    [[nodiscard]] const homo_set<false> &get_ds() const;
    [[nodiscard]] const set_t &get_zs() const;
    [[nodiscard]] const set_t &get_sup() const;
    [[nodiscard]] const set_t &get_inf() const;

    const elem next();
};

#endif //LATTICE_TRI_SET_HPP
